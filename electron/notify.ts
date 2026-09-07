import { Notification } from 'electron';
import type { RunResult, ShortcutMeta } from '../shared/types';

/** Shared by every automatic run path (hotkey, trigger) — manual runs from
 * the manager show their result inline instead. */
export function notifyRunResult(meta: ShortcutMeta, result: RunResult): void {
  const title = result.success ? `${meta.icon ?? '✅'} ${meta.name}` : `⚠️ ${meta.name} 실패`;
  const body = result.success
    ? result.stdout.trim().slice(0, 200) || '실행 완료'
    : result.stderr.trim().slice(0, 200) || `종료 코드 ${result.code}`;
  new Notification({ title, body }).show();
}
