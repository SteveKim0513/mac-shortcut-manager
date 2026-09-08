import { useEffect, useState } from 'react';

const CODE_TO_KEY: Record<string, string> = {
  Space: 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Enter: 'Return',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
};
for (let i = 1; i <= 24; i++) CODE_TO_KEY[`F${i}`] = `F${i}`;

const MODIFIER_CODES = new Set([
  'MetaLeft',
  'MetaRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
]);

// Electron accelerators are physical-key based (KeyD, not whatever letter a
// non-US layout produces for that key) — `e.code` tracks the physical key,
// `e.key` only comes in as a last-resort fallback for punctuation.
function mainKeyFromEvent(e: KeyboardEvent): string | null {
  if (MODIFIER_CODES.has(e.code)) return null;
  if (e.code.startsWith('Key')) return e.code.slice(3);
  if (e.code.startsWith('Digit')) return e.code.slice(5);
  if (CODE_TO_KEY[e.code]) return CODE_TO_KEY[e.code];
  if (e.key.length === 1) return e.key.toUpperCase();
  return null;
}

function acceleratorFromEvent(e: KeyboardEvent): string | null {
  const mainKey = mainKeyFromEvent(e);
  if (!mainKey) return null;
  const parts: string[] = [];
  if (e.metaKey) parts.push('Cmd');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(mainKey);
  return parts.join('+');
}

interface Props {
  value: string | null;
  error?: string | null;
  disabled?: boolean;
  allowClear?: boolean;
  onChange: (next: string | null) => void;
}

export default function HotkeyRecorder({ value, error, disabled, allowClear = true, onChange }: Props) {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    // Electron's globalShortcut fires system-wide regardless of what's
    // focused in-app — without this, pressing a combo an existing script
    // already owns would both get captured here *and* silently run that
    // script in the background. Suspend every registered hotkey for the
    // duration of recording so a conflicting combo is just input, not
    // an action; conflict detection still happens afterward via onChange.
    window.msm.suspendHotkeys();
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setRecording(false);
        return;
      }
      const accel = acceleratorFromEvent(e);
      if (!accel) return; // a bare modifier keydown — keep waiting
      onChange(accel);
      setRecording(false);
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.msm.resumeHotkeys();
    };
  }, [recording, onChange]);

  return (
    <div className="hotkey-recorder">
      <button
        type="button"
        className={`hotkey-recorder-btn${recording ? ' recording' : ''}${error ? ' has-error' : ''}`}
        disabled={disabled}
        onClick={() => setRecording(true)}
        title={disabled ? '저장하지 않은 변경사항을 먼저 저장하세요' : (error ?? undefined)}
      >
        {recording ? '키를 누르세요… (Esc 취소)' : value || '단축키 없음'}
      </button>
      {allowClear && value && !recording && (
        <button type="button" className="hotkey-recorder-clear" disabled={disabled} onClick={() => onChange(null)}>
          지우기
        </button>
      )}
    </div>
  );
}
