import { useMemo, useState } from 'react';
import { PRESETS, type Preset } from '../../shared/presets';

interface Props {
  onCreate: (preset: Preset) => void;
  onCancel: () => void;
}

export default function PresetBrowserDialog({ onCreate, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Preset | null>(null);

  const categories = useMemo(() => [...new Set(PRESETS.map((p) => p.category))], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRESETS.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog preset-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>프리셋에서 만들기</h2>
        <input
          className="dialog-input preset-search"
          placeholder="검색… (예: 다운로드, git, wifi)"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="preset-categories">
          <button
            className={`preset-chip${activeCategory === null ? ' active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`preset-chip${activeCategory === c ? ' active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="preset-body">
          <div className="preset-list">
            {filtered.length === 0 && <div className="preset-empty">일치하는 프리셋이 없습니다</div>}
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`preset-item${selected?.id === p.id ? ' active' : ''}`}
                onClick={() => setSelected(p)}
              >
                <span className="preset-item-icon">{p.icon}</span>
                <div className="preset-item-text">
                  <div className="preset-item-name">{p.name}</div>
                  <div className="preset-item-summary">{p.summary}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="preset-detail">
            {!selected ? (
              <div className="preset-detail-empty">왼쪽에서 프리셋을 선택하세요</div>
            ) : (
              <>
                <div className="preset-detail-title">
                  {selected.icon} {selected.name}
                </div>
                <p className="preset-detail-summary">{selected.summary}</p>
                <pre className="preset-detail-code">{selected.script}</pre>
              </>
            )}
          </div>
        </div>
        <div className="dialog-actions">
          <button onClick={onCancel}>취소</button>
          <button className="primary" disabled={!selected} onClick={() => selected && onCreate(selected)}>
            이 프리셋으로 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
