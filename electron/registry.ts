import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { globalShortcut, Notification } from 'electron';
import { parseScript } from './parser';
import { runScript } from './runner';
import { scriptsDir } from './paths';
import type { ShortcutMeta, RunResult } from '../shared/types';

const EXAMPLE_SCRIPT = `#!/bin/zsh
# @msm-name: 다크모드 토글
# @msm-hotkey:
# @msm-icon: 🌓
# @msm-description: macOS 시스템 다크모드를 켜고 끕니다
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'
`;

function ensureScriptsDir() {
  fs.mkdirSync(scriptsDir, { recursive: true });
  const hasAny = fs.readdirSync(scriptsDir).some((f) => f.endsWith('.sh'));
  if (!hasAny) {
    fs.writeFileSync(path.join(scriptsDir, 'dark-mode-toggle.sh'), EXAMPLE_SCRIPT, { mode: 0o755 });
  }
}

function notifyRunResult(meta: ShortcutMeta, result: RunResult) {
  const title = result.success ? `${meta.icon ?? '✅'} ${meta.name}` : `⚠️ ${meta.name} 실패`;
  const body = result.success
    ? result.stdout.trim().slice(0, 200) || '실행 완료'
    : result.stderr.trim().slice(0, 200) || `종료 코드 ${result.code}`;
  new Notification({ title, body }).show();
}

type Listener = (list: ShortcutMeta[]) => void;

// The .sh files under scriptsDir ARE the shortcuts — this class only mirrors
// that directory into memory (for fast palette search) and into OS-level
// global shortcut registrations. Every mutation flows through the watcher,
// so a file added/edited/removed via Finder, git, or our own IPC handlers
// all reconcile through the exact same path.
class ShortcutRegistry {
  private items = new Map<string, ShortcutMeta>();
  private registeredAccelerators = new Map<string, string>(); // filePath -> accelerator
  private listeners = new Set<Listener>();
  private watcher: FSWatcher | null = null;

  init() {
    ensureScriptsDir();
    this.watcher = chokidar.watch(scriptsDir, {
      ignoreInitial: false,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    });
    this.watcher.on('add', (p) => this.upsert(p));
    this.watcher.on('change', (p) => this.upsert(p));
    this.watcher.on('unlink', (p) => this.remove(p));
  }

  dispose() {
    void this.watcher?.close();
    for (const accel of this.registeredAccelerators.values()) globalShortcut.unregister(accel);
    this.registeredAccelerators.clear();
  }

  list(): ShortcutMeta[] {
    return [...this.items.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  onUpdate(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private upsert(filePath: string) {
    if (!filePath.endsWith('.sh')) return;
    try {
      this.items.set(filePath, parseScript(filePath));
    } catch (err) {
      console.error('[registry] failed to parse', filePath, err);
      return;
    }
    this.reconcileHotkeys();
    this.emit();
  }

  private remove(filePath: string) {
    this.items.delete(filePath);
    this.reconcileHotkeys();
    this.emit();
  }

  private reconcileHotkeys() {
    for (const [filePath, accel] of [...this.registeredAccelerators]) {
      const current = this.items.get(filePath);
      if (!current || current.hotkey !== accel) {
        globalShortcut.unregister(accel);
        this.registeredAccelerators.delete(filePath);
      }
    }
    for (const meta of this.items.values()) {
      if (!meta.hotkey) continue;
      if (this.registeredAccelerators.get(meta.filePath) === meta.hotkey) continue;
      const ok = globalShortcut.register(meta.hotkey, () => {
        void runScript(meta.filePath).then((result) => notifyRunResult(meta, result));
      });
      if (ok) {
        this.registeredAccelerators.set(meta.filePath, meta.hotkey);
        meta.hotkeyError = null;
      } else {
        meta.hotkeyError = '단축키 등록 실패 — 다른 앱이 이미 사용 중일 수 있습니다';
      }
    }
  }

  private emit() {
    const list = this.list();
    for (const listener of this.listeners) listener(list);
  }
}

export const registry = new ShortcutRegistry();
