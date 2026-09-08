import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { parseScript } from './parser';
import { runScript } from './runner';
import { scriptsDir } from './paths';
import { notifyRunResult } from './notify';
import { hotkeyRegistrar } from './hotkeys';
import type { ShortcutMeta } from '../shared/types';

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

type Listener = (list: ShortcutMeta[]) => void;

// The .sh files under scriptsDir ARE the shortcuts — this class only mirrors
// that directory into memory (for fast palette search) and into OS-level
// global shortcut registrations. Every mutation flows through the watcher,
// so a file added/edited/removed via Finder, git, or our own IPC handlers
// all reconcile through the exact same path.
class ShortcutRegistry {
  private items = new Map<string, ShortcutMeta>();
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
    for (const filePath of this.items.keys()) hotkeyRegistrar.release(filePath);
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
    hotkeyRegistrar.release(filePath);
    this.items.delete(filePath);
    this.reconcileHotkeys();
    this.emit();
  }

  private reconcileHotkeys() {
    // Sorted (not insertion order) so which script "wins" a duplicate
    // hotkey is at least predictable — the alphabetically-first name.
    for (const meta of this.list()) {
      if (!meta.hotkey) {
        hotkeyRegistrar.release(meta.filePath);
        meta.hotkeyError = null;
        continue;
      }
      const result = hotkeyRegistrar.claim(meta.hotkey, meta.filePath, meta.name, () => {
        void runScript(meta.filePath).then((r) => notifyRunResult(meta, r));
      });
      if (result.ok) {
        meta.hotkeyError = null;
      } else if (result.conflictLabel) {
        meta.hotkeyError = `이미 "${result.conflictLabel}"에서 쓰고 있는 단축키예요`;
      } else {
        meta.hotkeyError = '이 단축키는 이미 다른 앱이 쓰고 있는 것 같아요. 다른 조합으로 시도해보세요';
      }
    }
  }

  private emit() {
    const list = this.list();
    for (const listener of this.listeners) listener(list);
  }
}

export const registry = new ShortcutRegistry();
