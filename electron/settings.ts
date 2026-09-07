import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface AppSettings {
  paletteHotkey: string;
  openAtLogin: boolean;
  hideDockIcon: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  paletteHotkey: 'Alt+Space',
  openAtLogin: false,
  hideDockIcon: false,
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(next: AppSettings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
}
