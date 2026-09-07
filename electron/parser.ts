import fs from 'node:fs';
import path from 'node:path';
import type { ShortcutMeta } from '../shared/types';

// A shortcut's metadata lives inside the script itself as directive comments,
// so the .sh file is the single source of truth — no sidecar JSON to drift
// out of sync when someone renames/deletes the file outside the app.
type DirectiveKey = 'name' | 'hotkey' | 'icon' | 'description' | 'category';
const DIRECTIVE_RE = /^#\s*@msm-(name|hotkey|icon|description|category):\s*(.*?)\s*$/;
// Unlike the fields above, a script may declare more than one trigger
// (e.g. both `schedule 09:00` and `wake`), so these collect into an array
// instead of overwriting a single field.
const TRIGGER_RE = /^#\s*@msm-trigger:\s*(.*?)\s*$/;
const HEADER_LINES = 30;

export function parseScript(filePath: string): ShortcutMeta {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').slice(0, HEADER_LINES);
  const fields: Partial<Record<DirectiveKey, string>> = {};
  const triggers: string[] = [];
  for (const line of lines) {
    const match = DIRECTIVE_RE.exec(line);
    if (match) {
      fields[match[1] as DirectiveKey] = match[2];
      continue;
    }
    const triggerMatch = TRIGGER_RE.exec(line);
    if (triggerMatch && triggerMatch[1]) triggers.push(triggerMatch[1]);
  }
  const stat = fs.statSync(filePath);
  const fallbackName = path.basename(filePath).replace(/\.sh$/, '');
  return {
    id: filePath,
    filePath,
    name: fields.name?.trim() || fallbackName,
    hotkey: fields.hotkey?.trim() || null,
    icon: fields.icon?.trim() || null,
    description: fields.description?.trim() || null,
    category: fields.category?.trim() || null,
    triggers,
    updatedAt: stat.mtimeMs,
    hotkeyError: null,
  };
}

/**
 * Rewrites just the `@msm-hotkey` directive line, leaving the rest of the
 * script untouched — lets the hotkey recorder UI update a script's binding
 * without clobbering whatever the user is mid-editing in the raw text area.
 */
export function setHotkeyLine(filePath: string, hotkey: string | null): void {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const newLine = `# @msm-hotkey: ${hotkey ?? ''}`;
  const idx = lines.findIndex((l) => /^#\s*@msm-hotkey:/.test(l));
  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    lines.splice(lines[0]?.startsWith('#!') ? 1 : 0, 0, newLine);
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

export function scriptTemplate(name: string): string {
  return [
    '#!/bin/zsh',
    `# @msm-name: ${name}`,
    '# @msm-hotkey:',
    '# @msm-icon: ⚡',
    '# @msm-description:',
    '',
    '',
  ].join('\n');
}
