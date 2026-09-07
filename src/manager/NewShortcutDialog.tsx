import { useEffect, useRef, useState } from 'react';

interface Props {
  onCreate: (name: string) => void;
  onCancel: () => void;
}

// Electron's renderer does not implement window.prompt() — it silently
// returns null instead of showing anything, which is why "새로 만들기" used
// to do nothing at all. This is a real in-page dialog instead.
export default function NewShortcutDialog({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed);
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>새 단축어 이름</h2>
        <input
          ref={inputRef}
          className="dialog-input"
          value={name}
          placeholder="예: 다크모드 토글"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="dialog-actions">
          <button onClick={onCancel}>취소</button>
          <button className="primary" onClick={submit} disabled={!name.trim()}>
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
