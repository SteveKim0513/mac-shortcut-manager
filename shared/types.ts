export interface ShortcutMeta {
  /** Absolute path to the .sh file — doubles as the stable identifier. */
  id: string;
  filePath: string;
  name: string;
  hotkey: string | null;
  icon: string | null;
  description: string | null;
  category: string | null;
  updatedAt: number;
  /** Set when `hotkey` failed to register (e.g. another app already owns it). */
  hotkeyError: string | null;
}

export interface RunResult {
  success: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}
