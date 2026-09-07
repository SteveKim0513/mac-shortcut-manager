import { useEffect, useMemo, useState } from 'react';
import type { RunResult, ShortcutMeta } from '../../shared/types';
import type { UpdateStatus } from '../../electron/updater';
import HotkeyRecorder from './HotkeyRecorder';
import CodeEditor from './CodeEditor';
import NewShortcutDialog from './NewShortcutDialog';
import ConfirmDialog from './ConfirmDialog';
import SettingsDialog from './SettingsDialog';
import UpdateStatusPopup from './UpdateStatusPopup';
import './Manager.css';

const UNCATEGORIZED = '미분류';

export default function Manager() {
  const [items, setItems] = useState<ShortcutMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    window.msm.listShortcuts().then((list) => {
      setItems(list);
      if (list.length > 0) setSelectedId((prev) => prev ?? list[0].id);
    });
    return window.msm.onShortcutsUpdated(setItems);
  }, []);

  useEffect(() => {
    const offSettings = window.msm.onSettingsOpen(() => setSettingsOpen(true));
    const offUpdate = window.msm.onUpdateStatus(setUpdateStatus);
    return () => {
      offSettings();
      offUpdate();
    };
  }, []);

  // Loads the selected file's content exactly once per selection change —
  // NOT on every `items` update, otherwise editing shortcut A while shortcut
  // B changes on disk (another window, git pull, the hotkey recorder itself)
  // would silently overwrite A's unsaved textarea content.
  useEffect(() => {
    if (!selectedId) {
      setContent('');
      setSavedContent('');
      setRunResult(null);
      return;
    }
    window.msm.readShortcut(selectedId).then((text) => {
      setContent(text);
      setSavedContent(text);
      setRunResult(null);
    });
  }, [selectedId]);

  // If the selected shortcut was deleted elsewhere (Finder, git, another
  // window), drop the selection instead of showing a stale editor.
  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) setSelectedId(null);
  }, [items, selectedId]);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const dirty = content !== savedContent;

  const groups = useMemo(() => {
    const byCategory = new Map<string, ShortcutMeta[]>();
    for (const item of items) {
      const key = item.category || UNCATEGORIZED;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(item);
    }
    for (const list of byCategory.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return [...byCategory.entries()].sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b, 'ko');
    });
  }, [items]);

  async function handleSave() {
    if (!selectedId) return;
    await window.msm.saveShortcut(selectedId, content);
    setSavedContent(content);
  }

  async function handleRun() {
    if (!selectedId) return;
    if (dirty) await handleSave();
    setRunning(true);
    setRunResult(null);
    const result = await window.msm.runShortcut(selectedId);
    setRunResult(result);
    setRunning(false);
  }

  async function handleConfirmDelete() {
    if (!selectedId) return;
    await window.msm.deleteShortcut(selectedId);
    setSelectedId(null);
    setConfirmingDelete(false);
  }

  async function handleCreateSubmit(name: string) {
    const meta = await window.msm.createShortcut(name);
    setCreating(false);
    setSelectedId(meta.id);
  }

  async function handleSetHotkey(next: string | null) {
    if (!selectedId) return;
    await window.msm.setHotkey(selectedId, next);
    // The file changed underneath us — refresh the editor baseline so it
    // shows the new header line and doesn't read as falsely "dirty".
    const fresh = await window.msm.readShortcut(selectedId);
    setContent(fresh);
    setSavedContent(fresh);
  }

  return (
    <div className="manager">
      <aside className="manager-sidebar">
        <div className="manager-sidebar-header">
          <h1>단축어</h1>
          <div className="manager-sidebar-actions">
            <button className="manager-new-btn" onClick={() => setCreating(true)}>
              + 새로 만들기
            </button>
            <button className="manager-icon-btn" title="설정" onClick={() => setSettingsOpen(true)}>
              ⚙
            </button>
          </div>
        </div>
        <div className="manager-list">
          {items.length === 0 && (
            <div className="manager-empty">
              아직 단축어가 없습니다. "+ 새로 만들기"를 누르거나 ~/Documents/ShortcutScripts에
              .sh 파일을 추가하세요.
            </div>
          )}
          {groups.map(([category, list]) => (
            <div key={category}>
              <div className="manager-group-header">{category}</div>
              {list.map((item) => (
                <div
                  key={item.id}
                  className={`manager-item${item.id === selectedId ? ' active' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="manager-item-icon">{item.icon || '⚡'}</span>
                  <span className="manager-item-name">{item.name}</span>
                  {item.hotkey && <span className="kbd">{item.hotkey}</span>}
                  {item.hotkeyError && <span className="manager-item-warn">⚠</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="manager-main">
        {!selected ? (
          <div className="manager-placeholder">단축어를 선택하거나 새로 만드세요</div>
        ) : (
          <>
            <div className="manager-toolbar">
              <span className="manager-toolbar-title">
                {selected.icon || '⚡'} {selected.name}
              </span>
              <button onClick={() => void window.msm.revealShortcut(selected.id)}>Finder에서 보기</button>
              <button className="danger" onClick={() => setConfirmingDelete(true)}>
                삭제
              </button>
              <button onClick={() => void handleRun()} disabled={running}>
                {running ? '실행 중…' : '실행'}
              </button>
              <button className="primary" onClick={() => void handleSave()} disabled={!dirty}>
                저장 {dirty ? '●' : ''}
              </button>
            </div>
            <div className="manager-meta-row">
              <span className="manager-meta-label">단축키</span>
              <HotkeyRecorder
                value={selected.hotkey}
                error={selected.hotkeyError}
                disabled={dirty}
                onChange={(next) => void handleSetHotkey(next)}
              />
              {selected.hotkeyError && <span className="manager-hint warn">{selected.hotkeyError}</span>}
            </div>
            <div className="manager-hint">
              헤더 주석(# @msm-name / @msm-icon / @msm-description / @msm-category)으로 나머지 정보를
              설정합니다. 단축키는 위 버튼으로 등록하세요.
            </div>
            <CodeEditor value={content} onChange={setContent} onSave={() => void handleSave()} />
            {runResult && (
              <div className={`manager-output ${runResult.success ? 'success' : 'failure'}`}>
                {runResult.success
                  ? runResult.stdout || '(출력 없음) 실행 완료'
                  : `${runResult.stderr || `종료 코드 ${runResult.code}`}`}
              </div>
            )}
          </>
        )}
      </main>

      {creating && <NewShortcutDialog onCreate={(name) => void handleCreateSubmit(name)} onCancel={() => setCreating(false)} />}
      {confirmingDelete && selected && (
        <ConfirmDialog
          message={`"${selected.name}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} onCheckForUpdates={() => void window.msm.checkForUpdates()} />
      )}
      {updateStatus && (
        <UpdateStatusPopup
          status={updateStatus}
          onClose={() => setUpdateStatus(null)}
          onInstall={() => void window.msm.installUpdate()}
          onRetry={() => void window.msm.checkForUpdates()}
        />
      )}
    </div>
  );
}
