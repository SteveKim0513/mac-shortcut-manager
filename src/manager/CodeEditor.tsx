import { useEffect, useRef } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { tags as t } from '@lezer/highlight';
import './CodeEditor.css';

// Colors picked to sit inside the app's existing Linear/Cursor-derived dark
// theme (src/theme.css) rather than pulling in a full third-party CM theme.
const shellHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#6a6b6c', fontStyle: 'italic' },
  { tag: t.string, color: '#9fc9a2' },
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword], color: '#828fff' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#e6c07b' },
  { tag: t.number, color: '#d19a66' },
  { tag: t.meta, color: '#6a6b6c' },
  { tag: t.operator, color: '#c9c0ad' },
]);

const darkTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--ink)',
      backgroundColor: 'transparent',
      height: '100%',
      fontSize: '13px',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      caretColor: 'var(--accent-hover)',
      padding: '12px 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent-hover)' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--ink-faint)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--accent-soft) !important' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)' },
  },
  { dark: true },
);

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
}

export default function CodeEditor({ value, onChange, onSave }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Callbacks are re-created every render (they close over per-selection
  // state), but the EditorView itself is built once — route through refs so
  // the always-current callback runs without tearing the view down.
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          StreamLanguage.define(shell),
          syntaxHighlighting(shellHighlight),
          darkTheme,
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-s',
                run: () => {
                  onSaveRef.current();
                  return true;
                },
              },
            ]),
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally created once; `value` changes after mount are synced by
    // the effect below instead of tearing down and rebuilding the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the editor in sync when `value` changes for a reason other than
  // typing in it — switching the selected shortcut, or the hotkey recorder
  // rewriting the header line on disk.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div className="code-editor" ref={hostRef} />;
}
