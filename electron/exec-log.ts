import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const RETENTION_DAYS = 14;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function timestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function dateFolder(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fileStamp(d: Date): string {
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

let cachedZshVersion: string | null = null;

/** `zsh --version` output, e.g. "5.9" — cached for the process lifetime. */
export function zshVersion(): string {
  if (cachedZshVersion) return cachedZshVersion;
  try {
    const out = execFileSync('/bin/zsh', ['--version'], { encoding: 'utf8' });
    cachedZshVersion = out.match(/zsh (\S+)/)?.[1] ?? out.trim();
  } catch {
    cachedZshVersion = '확인 못함';
  }
  return cachedZshVersion;
}

export interface ExecLog {
  path: string;
  line(text: string): void;
  close(): void;
}

/** Root log directory — Electron resolves this to ~/Library/Logs/<app name> on macOS. */
export function logsRoot(): string {
  return app.getPath('logs');
}

/**
 * Opens one log file per script execution, independent of what the script
 * itself does — this is the one place every run passes through, so nothing
 * a script author forgets to add can skip logging.
 */
export function startExecLog(scriptPath: string): ExecLog {
  const now = new Date();
  const dir = path.join(logsRoot(), dateFolder(now));
  fs.mkdirSync(dir, { recursive: true });
  const name = path.basename(scriptPath, '.sh');
  const filePath = path.join(dir, `${name}-${fileStamp(now)}.log`);
  const fd = fs.openSync(filePath, 'a');

  return {
    path: filePath,
    line(text: string) {
      fs.writeSync(fd, `[${timestamp(new Date())}] ${text}\n`);
    },
    close() {
      fs.closeSync(fd);
    },
  };
}

/** Deletes date folders older than `retentionDays` so logs don't grow forever. */
export function cleanupOldLogs(retentionDays = RETENTION_DAYS): void {
  const root = logsRoot();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;
    const folderTime = new Date(`${entry.name}T00:00:00`).getTime();
    if (Number.isNaN(folderTime) || folderTime >= cutoff) continue;
    fs.rmSync(path.join(root, entry.name), { recursive: true, force: true });
  }
}
