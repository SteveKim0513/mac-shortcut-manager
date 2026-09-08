import { useEffect, useState } from 'react';
import type { AppSettings } from '../../electron/settings';
import HotkeyRecorder from './HotkeyRecorder';

interface Props {
  onClose: () => void;
  onCheckForUpdates: () => void;
  onSaved: (message: string) => void;
}

export default function SettingsDialog({ onClose, onCheckForUpdates, onSaved }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.msm.getSettings().then(setSettings);
    window.msm.getAppVersion().then(setVersion);
  }, []);

  async function update(partial: Partial<AppSettings>, savedMessage: string) {
    const result = await window.msm.setSettings(partial);
    setSettings(result.settings);
    setHotkeyError(result.error);
    onSaved(result.error ?? savedMessage);
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title">설정</h2>
        {settings && (
          <>
            <div className="settings-row">
              <span className="settings-label">팔레트 여는 단축키</span>
              <HotkeyRecorder
                value={settings.paletteHotkey}
                error={hotkeyError}
                allowClear={false}
                onChange={(next) => next && void update({ paletteHotkey: next }, `팔레트 단축키를 "${next}"로 바꿨어요`)}
              />
            </div>
            {hotkeyError && <div className="manager-hint warn">{hotkeyError}</div>}

            <label className="settings-row settings-checkbox">
              <span className="settings-label">로그인 시 자동 실행</span>
              <input
                type="checkbox"
                checked={settings.openAtLogin}
                onChange={(e) =>
                  void update(
                    { openAtLogin: e.target.checked },
                    e.target.checked ? '로그인할 때 자동으로 실행되게 했어요' : '로그인 시 자동 실행을 껐어요',
                  )
                }
              />
            </label>

            <label className="settings-row settings-checkbox">
              <span className="settings-label">Dock에서 숨기기 (메뉴바 전용)</span>
              <input
                type="checkbox"
                checked={settings.hideDockIcon}
                onChange={(e) =>
                  void update(
                    { hideDockIcon: e.target.checked },
                    e.target.checked ? 'Dock 아이콘을 숨겼어요' : 'Dock 아이콘을 다시 보여줄게요',
                  )
                }
              />
            </label>
          </>
        )}

        <div className="settings-row settings-update-row">
          <span className="settings-label">버전 {version}</span>
          <button onClick={onCheckForUpdates}>업데이트 확인</button>
        </div>

        <div className="dialog-actions">
          <button className="primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
