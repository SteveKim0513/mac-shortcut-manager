import { contextBridge, ipcRenderer } from 'electron';
import type { ShortcutMeta, RunResult } from '../shared/types';

const api = {
  listShortcuts: (): Promise<ShortcutMeta[]> => ipcRenderer.invoke('shortcuts:list'),
  runShortcut: (id: string): Promise<RunResult> => ipcRenderer.invoke('shortcuts:run', id),
  readShortcut: (id: string): Promise<string> => ipcRenderer.invoke('shortcuts:read', id),
  saveShortcut: (id: string, content: string): Promise<void> =>
    ipcRenderer.invoke('shortcuts:save', id, content),
  deleteShortcut: (id: string): Promise<void> => ipcRenderer.invoke('shortcuts:delete', id),
  setHotkey: (id: string, hotkey: string | null): Promise<void> =>
    ipcRenderer.invoke('shortcuts:setHotkey', id, hotkey),
  revealShortcut: (id: string): Promise<void> => ipcRenderer.invoke('shortcuts:reveal', id),
  createShortcut: (name: string): Promise<ShortcutMeta> => ipcRenderer.invoke('shortcuts:create', name),
  hidePalette: (): void => ipcRenderer.send('palette:hide'),
  openManager: (): void => ipcRenderer.send('manager:open'),
  onShortcutsUpdated: (cb: (list: ShortcutMeta[]) => void): (() => void) => {
    const listener = (_e: unknown, list: ShortcutMeta[]) => cb(list);
    ipcRenderer.on('shortcuts:updated', listener);
    return () => ipcRenderer.off('shortcuts:updated', listener);
  },
  onPaletteShown: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('palette:shown', listener);
    return () => ipcRenderer.off('palette:shown', listener);
  },
};

export type MsmApi = typeof api;

contextBridge.exposeInMainWorld('msm', api);
