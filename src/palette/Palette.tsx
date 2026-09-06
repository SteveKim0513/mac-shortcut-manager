import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShortcutMeta } from '../../shared/types';
import './Palette.css';

function score(item: ShortcutMeta, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const name = item.name.toLowerCase();
  if (name === q) return 3;
  if (name.startsWith(q)) return 2;
  if (
    name.includes(q) ||
    item.description?.toLowerCase().includes(q) ||
    item.category?.toLowerCase().includes(q)
  )
    return 1;
  return -1;
}

export default function Palette() {
  const [items, setItems] = useState<ShortcutMeta[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.msm.listShortcuts().then(setItems);
    const offUpdate = window.msm.onShortcutsUpdated(setItems);
    const offShown = window.msm.onPaletteShown(() => {
      setQuery('');
      setSelected(0);
      inputRef.current?.focus();
    });
    return () => {
      offUpdate();
      offShown();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.map((item) => ({ item, s: score(item, query) })).filter((r) => r.s >= 0).sort((a, b) => b.s - a.s).map((r) => r.item);
  }, [items, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  async function runSelected() {
    const target = filtered[selected];
    if (!target) return;
    window.msm.hidePalette();
    await window.msm.runShortcut(target.id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void runSelected();
    } else if (e.key === 'Escape') {
      window.msm.hidePalette();
    }
  }

  return (
    <div className="palette">
      <div className="palette-shell">
        <input
          ref={inputRef}
          autoFocus
          className="palette-input"
          placeholder="단축어 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="palette-list">
          {filtered.length === 0 && <div className="palette-empty">일치하는 단축어가 없습니다</div>}
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className={`palette-row${i === selected ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => void runSelected()}
            >
              <span className="palette-row-icon">{item.icon || '⚡'}</span>
              <span className="palette-row-name">{item.name}</span>
              {item.hotkey && (
                <span className="kbd palette-row-hotkey">{item.hotkey}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
