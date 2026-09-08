interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">삭제 확인</h2>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button onClick={onCancel}>취소</button>
          <button className="danger" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
