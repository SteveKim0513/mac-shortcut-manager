import { Notification } from 'electron';
import type { RunResult, ShortcutMeta } from '../shared/types';

/** Shown for every run, from every path (manager button, palette, hotkey,
 * trigger) — see electron/main.ts's 'shortcuts:run' handler. Wording stays
 * warm and plain: a raw exit code means nothing to most users, so it only
 * shows up as a soft parenthetical, never the whole message. */
export function notifyRunResult(meta: ShortcutMeta, result: RunResult): void {
  const title = result.success ? `${meta.icon ?? '✅'} ${meta.name}` : `⚠️ ${meta.name} 실행에 실패했어요`;
  const body = result.success
    ? result.stdout.trim().slice(0, 200) || '잘 실행됐어요'
    : result.stderr.trim().slice(0, 200) || `문제가 생겼어요 (종료 코드 ${result.code})`;
  new Notification({ title, body }).show();
}
