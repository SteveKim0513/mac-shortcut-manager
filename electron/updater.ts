import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from './logger';
import { shouldEnableUpdates } from '../shared/updateGate';

/**
 * Auto-update via GitHub Releases — same shape as mind-map's electron/updater.ts.
 *
 * UX rules: the user only hears about an update once it's fully downloaded
 * ("지금 재시동 / 나중에"); background check failures stay in the log. A manual
 * "업데이트 확인" from Settings does report its outcome either way. Updates run
 * only in the packaged build, never in `npm run dev`. MSM_UPDATE_URL overrides
 * the feed (for testing against a local update server).
 *
 * Caveat: this repo is currently private. electron-updater's GitHub provider
 * needs a token to read release assets from a private repo (GH_TOKEN / an
 * app-update.yml token) — without one, checks will fail with 404. Either make
 * the repo public before relying on this, or supply that token at runtime.
 */

const FIRST_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export type UpdateStatus =
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; version: string; percent: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'up-to-date'; version: string }
  | { phase: 'error'; message?: string }
  | { phase: 'dev-disabled' };

let interactive = false; // a manual check is driving the in-app popup
let pendingVersion = '';
let downloadedVersion: string | null = null;
let getWin: () => BrowserWindow | null = () => null;

function emit(status: UpdateStatus) {
  getWin()?.webContents.send('update:status', status);
}

function isUpdateEnabled(): boolean {
  return shouldEnableUpdates({ packaged: app.isPackaged, feedOverride: !!process.env.MSM_UPDATE_URL });
}

async function promptRestart(version: string) {
  const win = getWin();
  const opts = {
    type: 'info' as const,
    message: `새 버전 v${version}이 준비되었습니다`,
    detail: '지금 재시동하면 바로 적용됩니다. 나중에 해도 다음에 앱을 종료할 때 자동으로 적용돼요.',
    buttons: ['지금 재시동', '나중에'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts);
  if (response === 0) {
    log.info('[updater] restarting to install', version);
    autoUpdater.quitAndInstall();
  } else {
    log.info('[updater] install deferred to next quit', version);
  }
}

export function initAutoUpdate(getWindow: () => BrowserWindow | null) {
  getWin = getWindow;
  if (!isUpdateEnabled()) {
    log.info(`[updater] disabled (packaged=${app.isPackaged})`);
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // "나중에" still applies on quit

  if (process.env.MSM_UPDATE_URL) {
    autoUpdater.forceDevUpdateConfig = !app.isPackaged;
    autoUpdater.setFeedURL({ provider: 'generic', url: process.env.MSM_UPDATE_URL });
    log.info('[updater] feed overridden:', process.env.MSM_UPDATE_URL);
  }

  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version;
    log.info('[updater] available:', info.version);
    if (interactive) emit({ phase: 'available', version: info.version });
  });
  autoUpdater.on('download-progress', (p) => {
    if (interactive) emit({ phase: 'downloading', version: pendingVersion, percent: Math.round(p.percent) });
  });
  autoUpdater.on('update-not-available', () => {
    if (interactive) {
      interactive = false;
      emit({ phase: 'up-to-date', version: app.getVersion() });
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;
    log.info('[updater] downloaded:', info.version);
    if (interactive) {
      interactive = false;
      emit({ phase: 'downloaded', version: info.version });
    } else {
      void promptRestart(info.version); // background download → native prompt
    }
  });
  autoUpdater.on('error', (err) => {
    log.warn('[updater] error:', err?.message ?? err);
    if (interactive) {
      interactive = false;
      emit({ phase: 'error', message: err?.message });
    }
  });

  setTimeout(() => void autoUpdater.checkForUpdates().catch(() => {}), FIRST_CHECK_DELAY_MS);
  setInterval(() => void autoUpdater.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS);
  log.info('[updater] enabled — first check in 10s, then every 4h');
}

/** Manual "업데이트 확인" (Settings) — drives the in-app popup for instant feedback. */
export function checkForUpdatesManually() {
  if (!isUpdateEnabled()) {
    emit({ phase: 'dev-disabled' });
    return;
  }
  if (downloadedVersion) {
    emit({ phase: 'downloaded', version: downloadedVersion });
    return;
  }
  interactive = true;
  emit({ phase: 'checking' });
  void autoUpdater.checkForUpdates().catch((e) => {
    if (interactive) {
      interactive = false;
      emit({ phase: 'error', message: String(e?.message ?? e) });
    }
  });
}

/** Restart now and install the downloaded update. */
export function installUpdate() {
  if (downloadedVersion) autoUpdater.quitAndInstall();
}
