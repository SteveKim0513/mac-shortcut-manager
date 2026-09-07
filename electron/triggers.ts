import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { powerMonitor } from 'electron';
import { runScript } from './runner';
import { notifyRunResult } from './notify';
import type { ShortcutMeta } from '../shared/types';

export type TriggerSpec =
  | { kind: 'schedule'; time: string } // "HH:MM", 24h
  | { kind: 'login' }
  | { kind: 'wake' }
  | { kind: 'folder'; path: string };

/** Parses one `@msm-trigger` directive value, e.g. "schedule 09:00". Unknown
 * or malformed lines are dropped rather than crashing the whole script's
 * metadata — a typo in a trigger shouldn't take out the hotkey too. */
export function parseTriggerLine(raw: string): TriggerSpec | null {
  const [type, ...rest] = raw.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (type) {
    case 'schedule':
      return /^\d{2}:\d{2}$/.test(arg) ? { kind: 'schedule', time: arg } : null;
    case 'login':
      return { kind: 'login' };
    case 'wake':
      return { kind: 'wake' };
    case 'folder': {
      if (!arg) return null;
      const expanded = arg.startsWith('~') ? path.join(os.homedir(), arg.slice(1)) : arg;
      return { kind: 'folder', path: expanded };
    }
    default:
      return null;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function runTriggered(meta: ShortcutMeta, args: string[] = []) {
  void runScript(meta.filePath, args).then((result) => notifyRunResult(meta, result));
}

interface Entry {
  meta: ShortcutMeta;
  triggers: TriggerSpec[];
}

const SCHEDULE_CHECK_INTERVAL_MS = 20_000;

// Reconciles against the live shortcut list the same way registry.ts
// reconciles global hotkeys: on every update, diff what's needed against
// what's currently active (folder watchers) and adjust — no separate config
// to fall out of sync with the .sh files themselves.
class TriggerEngine {
  private entries = new Map<string, Entry>(); // filePath -> entry
  private folderWatchers = new Map<string, FSWatcher>(); // folder path -> watcher
  private lastFiredAt = new Map<string, string>(); // `${filePath}|${time}` -> "YYYY-MM-DD HH:MM"
  private scheduleTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.scheduleTimer = setInterval(() => this.checkSchedules(), SCHEDULE_CHECK_INTERVAL_MS);
    powerMonitor.on('resume', () => {
      for (const entry of this.entries.values()) {
        if (entry.triggers.some((t) => t.kind === 'wake')) runTriggered(entry.meta);
      }
    });
  }

  dispose(): void {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
    for (const watcher of this.folderWatchers.values()) void watcher.close();
    this.folderWatchers.clear();
    this.entries.clear();
  }

  sync(items: ShortcutMeta[]): void {
    const next = new Map<string, Entry>();
    for (const meta of items) {
      const triggers = meta.triggers.map(parseTriggerLine).filter((t): t is TriggerSpec => t !== null);
      if (triggers.length > 0) next.set(meta.filePath, { meta, triggers });
    }
    this.entries = next;
    this.reconcileFolderWatchers();
  }

  /** Called once, shortly after startup — the closest local proxy for
   * "runs at login" a menu-bar app (not a real login daemon) can offer. */
  fireLoginTriggers(): void {
    for (const entry of this.entries.values()) {
      if (entry.triggers.some((t) => t.kind === 'login')) runTriggered(entry.meta);
    }
  }

  private checkSchedules(): void {
    const now = new Date();
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${hhmm}`;
    for (const entry of this.entries.values()) {
      for (const t of entry.triggers) {
        if (t.kind !== 'schedule' || t.time !== hhmm) continue;
        const dedupeKey = `${entry.meta.filePath}|${t.time}`;
        if (this.lastFiredAt.get(dedupeKey) === dateKey) continue; // already fired today
        this.lastFiredAt.set(dedupeKey, dateKey);
        runTriggered(entry.meta);
      }
    }
  }

  private reconcileFolderWatchers(): void {
    const needed = new Set<string>();
    for (const entry of this.entries.values()) {
      for (const t of entry.triggers) if (t.kind === 'folder') needed.add(t.path);
    }
    for (const [folder, watcher] of this.folderWatchers) {
      if (!needed.has(folder)) {
        void watcher.close();
        this.folderWatchers.delete(folder);
      }
    }
    for (const folder of needed) {
      if (this.folderWatchers.has(folder) || !fs.existsSync(folder)) continue;
      const watcher = chokidar.watch(folder, { ignoreInitial: true, depth: 0 });
      watcher.on('add', (addedPath) => {
        for (const entry of this.entries.values()) {
          if (entry.triggers.some((t) => t.kind === 'folder' && t.path === folder)) {
            runTriggered(entry.meta, [addedPath]);
          }
        }
      });
      this.folderWatchers.set(folder, watcher);
    }
  }
}

export const triggerEngine = new TriggerEngine();
