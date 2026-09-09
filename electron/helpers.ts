import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

// Shortcuts.app's "Ask for Input" equivalent — instead of a new app-level UI
// (which would break script-only), these are plain shell commands a script
// can call directly. Arguments are passed through osascript's `argv` rather
// than interpolated into the AppleScript source, so quotes/backslashes in
// the prompt text can't break the dialog.
const HELPERS: Record<string, string> = {
  'msm-ask': `#!/bin/zsh
# msm-ask "질문" — prints the typed answer (empty on cancel).
osascript - "$1" <<'APPLESCRIPT'
on run argv
  set q to item 1 of argv
  activate
  try
    display dialog q default answer "" with title "Shortcut Manager" buttons {"취소", "확인"} default button "확인"
    return text returned of result
  on error
    return ""
  end try
end run
APPLESCRIPT
`,
  'msm-confirm': `#!/bin/zsh
# msm-confirm "질문" — exit 0 if "예", exit 1 otherwise (incl. cancel).
answer=$(osascript - "$1" <<'APPLESCRIPT'
on run argv
  set q to item 1 of argv
  activate
  try
    display dialog q with title "Shortcut Manager" buttons {"아니요", "예"} default button "예"
    return button returned of result
  on error
    return "아니요"
  end try
end run
APPLESCRIPT
)
[[ "$answer" == "예" ]]
`,
  'msm-choose': `#!/bin/zsh
# msm-choose "제목" opt1 opt2 ... — prints the chosen option (empty on cancel).
title="$1"; shift
osascript - "$title" "$@" <<'APPLESCRIPT'
on run argv
  set q to item 1 of argv
  set opts to {}
  repeat with i from 2 to (count of argv)
    set end of opts to item i of argv
  end repeat
  activate
  try
    set choice to choose from list opts with title "Shortcut Manager" with prompt q OK button name "선택" cancel button name "취소" without multiple selections allowed
    if choice is false then return ""
    return item 1 of choice
  on error
    return ""
  end try
end run
APPLESCRIPT
`,
};

export function helpersDir(): string {
  return path.join(app.getPath('userData'), 'bin');
}

/** Writes msm-ask/msm-choose/msm-confirm to userData/bin — idempotent, safe
 * to re-run on every launch so an app update can change their content. */
export function installHelpers(): void {
  const dir = helpersDir();
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(HELPERS)) {
    fs.writeFileSync(path.join(dir, name), content, { mode: 0o755 });
  }
}
