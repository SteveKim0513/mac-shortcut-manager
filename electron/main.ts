import { app, BrowserWindow, globalShortcut, ipcMain, Menu, shell, Tray } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { registry } from './registry';
import { runScript } from './runner';
import { parseScript, scriptTemplate, setHotkeyLine } from './parser';
import { scriptsDir } from './paths';
import { createTrayIcon } from './tray-icon';
import { loadSettings, saveSettings, type AppSettings } from './settings';
import { initAutoUpdate, checkForUpdatesManually, installUpdate } from './updater';
import { triggerEngine } from './triggers';
import { installHelpers } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// vite-plugin-electron injects this during `npm run dev`; absent in a
// packaged/`npm run build` app, which loads the built dist/index.html instead.
process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

// A second launch must not spin up a second watcher/tray/hotkey set onto the
// same scripts folder — hand off to the already-running instance instead.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

let settings: AppSettings = loadSettings();

let managerWindow: BrowserWindow | null = null;
let paletteWindow: BrowserWindow | null = null;
// Module-scope reference required — Electron destroys the Tray as soon as
// its NativeImage/Tray object is garbage-collected.
let tray: Tray | null = null;

function createManagerWindow() {
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.show();
    managerWindow.focus();
    return;
  }
  managerWindow = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: 'Shortcut Manager',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0b0b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (VITE_DEV_SERVER_URL) {
    managerWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    managerWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
  managerWindow.on('closed', () => {
    managerWindow = null;
  });
}

function createPaletteWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 640,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    vibrancy: 'popover',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}?palette=1`);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { search: 'palette=1' });
  }
  // Spotlight-style dismissal: losing focus closes the palette, it isn't a
  // window you manage.
  win.on('blur', () => win.hide());
  win.on('closed', () => {
    if (paletteWindow === win) paletteWindow = null;
  });
  return win;
}

function togglePalette() {
  if (!paletteWindow || paletteWindow.isDestroyed()) paletteWindow = createPaletteWindow();
  if (paletteWindow.isVisible()) {
    paletteWindow.hide();
    return;
  }
  paletteWindow.center();
  paletteWindow.show();
  paletteWindow.focus();
  paletteWindow.webContents.send('palette:shown');
}

// Opens (or focuses) the manager window, then runs `fn` once its page has
// actually loaded — a webContents.send() fired before that point is dropped,
// which matters for tray/menu actions that jump straight into "설정" or an
// update check on a manager window that isn't open yet.
function openManagerThen(fn: () => void) {
  createManagerWindow();
  const win = managerWindow!;
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', fn);
  else fn();
}

// Swaps the registered global accelerator for the palette. Re-registers the
// previous one on failure so a bad input never leaves the app with no way to
// open the palette at all.
function applyPaletteHotkey(next: string): boolean {
  globalShortcut.unregister(settings.paletteHotkey);
  const ok = globalShortcut.register(next, togglePalette);
  if (ok) {
    settings = { ...settings, paletteHotkey: next };
    saveSettings(settings);
  } else {
    globalShortcut.register(settings.paletteHotkey, togglePalette);
  }
  return ok;
}

function applyLoginAndDockSettings() {
  // Login-item registration needs a real installed app bundle — it errors
  // (harmlessly) against the ad-hoc `npm run dev` Electron binary.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.openAtLogin });
  if (process.platform === 'darwin') {
    if (settings.hideDockIcon) app.dock?.hide();
    else app.dock?.show();
  }
}

// A minimal custom app menu still needs Edit-role items, or ⌘C/⌘V/⌘A stop
// working in every text input and textarea across both windows.
function buildAppMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: '설정…', click: () => openManagerThen(() => managerWindow?.webContents.send('settings:open')) },
        { label: '업데이트 확인…', click: () => openManagerThen(() => checkForUpdatesManually()) },
        { type: 'separator' },
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Shortcut Manager');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '매니저 열기', click: () => createManagerWindow() },
      { label: '팔레트 열기', click: () => togglePalette() },
      { label: '단축어 폴더 열기', click: () => void shell.openPath(scriptsDir) },
      { type: 'separator' },
      { label: '설정…', click: () => openManagerThen(() => managerWindow?.webContents.send('settings:open')) },
      { label: '업데이트 확인…', click: () => openManagerThen(() => checkForUpdatesManually()) },
      { type: 'separator' },
      { label: '종료', role: 'quit' },
    ]),
  );
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return; // a second instance is quitting — set nothing up

  installHelpers();
  registry.init();
  registry.onUpdate((list) => {
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('shortcuts:updated', list);
    triggerEngine.sync(list);
  });
  triggerEngine.start();
  // A short delay so the initial folder scan (async) has populated the
  // trigger list before "login" triggers are evaluated.
  setTimeout(() => triggerEngine.fireLoginTriggers(), 2000);

  applyLoginAndDockSettings();
  buildAppMenu();
  createManagerWindow();
  createTray();
  initAutoUpdate(() => managerWindow);

  const ok = globalShortcut.register(settings.paletteHotkey, togglePalette);
  if (!ok) console.warn(`[palette] ${settings.paletteHotkey} already in use by another app`);

  app.on('activate', () => createManagerWindow());
  // Someone launched a second instance — surface the existing one instead.
  app.on('second-instance', () => createManagerWindow());
});

// A background utility app: closing the manager window should not quit the
// app, since global shortcuts and the palette need to keep working.
app.on('window-all-closed', () => {});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  registry.dispose();
  triggerEngine.dispose();
});

ipcMain.handle('shortcuts:list', () => registry.list());

ipcMain.handle('shortcuts:run', (_e, id: string) => runScript(id));

ipcMain.handle('shortcuts:read', (_e, id: string) => fs.readFileSync(id, 'utf8'));

ipcMain.handle('shortcuts:save', (_e, id: string, content: string) => {
  fs.writeFileSync(id, content);
});

ipcMain.handle('shortcuts:setHotkey', (_e, id: string, hotkey: string | null) => {
  setHotkeyLine(id, hotkey);
});

ipcMain.handle('shortcuts:delete', (_e, id: string) => {
  fs.unlinkSync(id);
});

ipcMain.handle('shortcuts:reveal', (_e, id: string) => {
  shell.showItemInFolder(id);
});

ipcMain.handle('shortcuts:create', (_e, name: string) => {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'new-shortcut';
  let filePath = path.join(scriptsDir, `${slug}.sh`);
  let n = 1;
  while (fs.existsSync(filePath)) filePath = path.join(scriptsDir, `${slug}-${n++}.sh`);
  fs.writeFileSync(filePath, scriptTemplate(name), { mode: 0o755 });
  return parseScript(filePath);
});

ipcMain.on('palette:hide', () => paletteWindow?.hide());

ipcMain.on('manager:open', () => createManagerWindow());

ipcMain.handle('settings:get', () => settings);

ipcMain.handle('settings:set', (_e, partial: Partial<AppSettings>) => {
  if (typeof partial.paletteHotkey === 'string' && partial.paletteHotkey !== settings.paletteHotkey) {
    const ok = applyPaletteHotkey(partial.paletteHotkey);
    if (!ok) return { settings, error: '단축키 등록 실패 — 다른 앱이 이미 사용 중일 수 있습니다' };
  }
  if (typeof partial.openAtLogin === 'boolean') settings = { ...settings, openAtLogin: partial.openAtLogin };
  if (typeof partial.hideDockIcon === 'boolean') settings = { ...settings, hideDockIcon: partial.hideDockIcon };
  saveSettings(settings);
  applyLoginAndDockSettings();
  return { settings, error: null };
});

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('update:check', () => checkForUpdatesManually());

ipcMain.handle('update:install', () => installUpdate());
