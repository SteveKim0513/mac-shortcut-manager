import { useMemo, useState } from 'react';
import { PRESETS, PRESET_GROUPS, isPresetGroup, type Preset, type PresetGroup } from '../../shared/presets';

type Entry = Preset | PresetGroup;

interface Props {
  onCreate: (preset: Preset) => void;
  onCreateGroup: (group: PresetGroup) => void;
  onCancel: () => void;
}

export default function PresetBrowserDialog({ onCreate, onCreateGroup, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);

  // Groups surface first — they're the more deliberate, curated picks —
  // followed by every single-script preset, all sharing one search/filter.
  const allEntries = useMemo<Entry[]>(() => [...PRESET_GROUPS, ...PRESETS], []);

  const categories = useMemo(() => [...new Set(allEntries.map((e) => e.category))], [allEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (activeCategory && e.category !== activeCategory) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [allEntries, query, activeCategory]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog preset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="preset-dialog-title">프리셋에서 만들기</h2>
        <input
          className="dialog-input preset-search"
          aria-label="프리셋 검색"
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
            {filtered.map((e) => (
              <div
                key={e.id}
                className={`preset-item${selected?.id === e.id ? ' active' : ''}`}
                onClick={() => setSelected(e)}
              >
                <span className="preset-item-icon">{e.icon}</span>
                <div className="preset-item-text">
                  <div className="preset-item-name">
                    {e.name}
                    {isPresetGroup(e) && <span className="preset-item-badge">{e.presets.length}개 세트</span>}
                  </div>
                  <div className="preset-item-summary">{e.summary}</div>
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
                {isPresetGroup(selected) ? (
                  <div className="preset-group-members">
                    {selected.presets.map((p) => (
                      <div key={p.id} className="preset-group-member">
                        <span className="preset-item-icon">{p.icon}</span>
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="preset-detail-code">{selected.script}</pre>
                )}
              </>
            )}
          </div>
        </div>
        <div className="dialog-actions">
          <button onClick={onCancel}>취소</button>
          <button
            className="primary"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              if (isPresetGroup(selected)) onCreateGroup(selected);
              else onCreate(selected);
            }}
          >
            {selected && isPresetGroup(selected) ? `${selected.presets.length}개 한번에 만들기` : '이 프리셋으로 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
