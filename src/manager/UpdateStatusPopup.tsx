import { useEffect } from 'react';
import type { UpdateStatus } from '../../electron/updater';

interface Props {
  status: UpdateStatus;
  onClose: () => void;
  onInstall: () => void;
  onRetry: () => void;
}

// Immediate in-app feedback for "업데이트 확인" — mirrors mind-map's
// src/ui/UpdateStatus.tsx (spinner while checking, then a clear result)
// instead of a slow native dialog that feels like a hang.
export default function UpdateStatusPopup({ status, onClose, onInstall, onRetry }: Props) {
  const busy = status.phase === 'checking' || status.phase === 'available' || status.phase === 'downloading';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [busy, onClose]);

  let title = '';
  let sub: string | null = null;
  let actions: React.ReactNode = null;

  switch (status.phase) {
    case 'checking':
      title = '업데이트 확인 중…';
      sub = '잠시만요, 최신 버전을 확인하고 있어요.';
      break;
    case 'available':
      title = `새 버전 v${status.version}이 나왔어요`;
      sub = '받아오는 중이에요…';
      break;
    case 'downloading':
      title = `v${status.version} 받는 중이에요`;
      sub = `${status.percent}%`;
      break;
    case 'up-to-date':
      title = '최신 버전을 쓰고 계세요';
      sub = `v${status.version}`;
      actions = (
        <button className="primary" onClick={onClose}>
          확인
        </button>
      );
      break;
    case 'downloaded':
      title = `v${status.version} 준비됐어요`;
      sub = '지금 재시동하면 바로 적용돼요.';
      actions = (
        <>
          <button onClick={onClose}>나중에</button>
          <button className="primary" onClick={onInstall}>
            지금 재시동
          </button>
        </>
      );
      break;
    case 'error':
      title = '업데이트를 확인하지 못했어요';
      sub = '네트워크 연결을 확인해 주세요. 앱은 계속 사용할 수 있어요.';
      actions = (
        <>
          <button onClick={onClose}>닫기</button>
          <button className="primary" onClick={onRetry}>
            다시 시도
          </button>
        </>
      );
      break;
    case 'dev-disabled':
      title = '개발 빌드예요';
      sub = '이 빌드에서는 자동 업데이트가 꺼져 있습니다.';
      actions = (
        <button className="primary" onClick={onClose}>
          확인
        </button>
      );
      break;
  }

  return (
    <div className="dialog-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-live="polite" onMouseDown={(e) => e.stopPropagation()}>
        {status.phase === 'downloading' && (
          <div className="update-progress">
            <div className="update-progress-fill" style={{ width: `${status.percent}%` }} />
          </div>
        )}
        <h2>{title}</h2>
        {sub && <p className="dialog-message">{sub}</p>}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
