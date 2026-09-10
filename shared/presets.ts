export interface Preset {
  id: string;
  name: string;
  icon: string;
  category: string;
  summary: string;
  /** Full .sh file content, ready to save as-is. */
  script: string;
}

// Curated for everyday, casual Mac users — not developers.
// Every script here is hand-verified: run for real where it's safe and
// harmless (read-only queries, clipboard transforms, timers), syntax-checked
// with `zsh -n` where it isn't (things that move/delete real files or toggle
// system state). See PRINCIPLES.md — no new execution model, just scripts.
export const PRESETS: Preset[] = [
  // ── 생산성 ──────────────────────────────────────────────────────────
  {
    id: 'dated-note',
    name: '오늘 날짜로 메모 만들기',
    icon: '🗒️',
    category: '생산성',
    summary: 'Notes 앱에 오늘 날짜를 제목으로 새 메모를 만들어요',
    script: `#!/bin/zsh
# @msm-name: 오늘 날짜로 메모 만들기
# @msm-icon: 🗒️
# @msm-category: 생산성
# @msm-description: Notes 앱에 오늘 날짜를 제목으로 새 메모를 만듭니다 (처음 실행하면 macOS가 Notes 접근을 허용할지 물어봐요)
today=$(date "+%Y-%m-%d")
osascript - "$today" <<'APPLESCRIPT'
on run argv
  set d to item 1 of argv
  tell application "Notes" to make new note with properties {name:d}
end run
APPLESCRIPT
echo "오늘 날짜 메모를 만들었어요: $today"
`,
  },
  {
    id: 'focus-timer-25',
    name: '25분 집중 타이머',
    icon: '🍅',
    category: '생산성',
    summary: '뽀모도로 스타일로 25분 뒤에 알려줘요',
    script: `#!/bin/zsh
# @msm-name: 25분 집중 타이머
# @msm-icon: 🍅
# @msm-category: 생산성
# @msm-description: 25분 뒤 알림을 보내는 뽀모도로 타이머예요 (백그라운드로 돌아가고 이 스크립트는 바로 끝나요)
( sleep 1500; osascript -e 'display notification "25분 집중 끝! 잠깐 쉬어요" with title "뽀모도로 타이머"' ) > /dev/null 2>&1 &
disown
echo "25분 집중 타이머를 시작했어요"
`,
  },
  {
    id: 'break-timer-5',
    name: '5분 휴식 타이머',
    icon: '⏰',
    category: '생산성',
    summary: '5분 뒤에 다시 시작하라고 알려줘요',
    script: `#!/bin/zsh
# @msm-name: 5분 휴식 타이머
# @msm-icon: ⏰
# @msm-category: 생산성
( sleep 300; osascript -e 'display notification "5분 휴식 끝! 다시 시작해볼까요" with title "휴식 타이머"' ) > /dev/null 2>&1 &
disown
echo "5분 휴식 타이머를 시작했어요"
`,
  },
  {
    id: 'todo-count',
    name: '할 일 몇 개 남았는지 확인',
    icon: '✅',
    category: '생산성',
    summary: '미리알림에 안 끝낸 할 일이 몇 개인지 알려줘요',
    script: `#!/bin/zsh
# @msm-name: 할 일 몇 개 남았는지 확인
# @msm-icon: ✅
# @msm-category: 생산성
count=$(osascript -e 'tell application "Reminders" to count of (every reminder whose completed is false)')
echo "아직 안 끝낸 할 일이 \${count}개 있어요"
`,
  },
  {
    id: 'quick-reminder',
    name: '미리알림 빠르게 추가',
    icon: '📝',
    category: '생산성',
    summary: '입력한 내용을 미리알림 앱에 바로 추가해요',
    script: `#!/bin/zsh
# @msm-name: 미리알림 빠르게 추가
# @msm-icon: 📝
# @msm-category: 생산성
title=$(msm-ask "미리알림 내용")
if [ -z "$title" ]; then
  echo "취소했어요"
  exit 0
fi
osascript - "$title" <<'APPLESCRIPT'
on run argv
  set t to item 1 of argv
  tell application "Reminders" to make new reminder with properties {name:t}
end run
APPLESCRIPT
echo "미리알림에 추가했어요: $title"
`,
  },
  {
    id: 'daily-apps',
    name: '자주 쓰는 앱 한번에 열기',
    icon: '📌',
    category: '생산성',
    summary: '하루를 시작할 때 쓰는 앱을 한 번에 열어요 (앱 이름은 원하는 대로 수정)',
    script: `#!/bin/zsh
# @msm-name: 자주 쓰는 앱 한번에 열기
# @msm-icon: 📌
# @msm-category: 생산성
# @msm-description: 자주 쓰는 앱을 한 번에 엽니다 — 앱 이름을 원하는 대로 바꿔서 쓰세요
open -a "Safari" 2>/dev/null
open -a "Mail" 2>/dev/null
open -a "Notes" 2>/dev/null
echo "자주 쓰는 앱을 열었어요"
`,
  },

  // ── 파일 ────────────────────────────────────────────────────────────
  {
    id: 'organize-downloads',
    name: '다운로드 폴더 정리',
    icon: '🗂️',
    category: '파일',
    summary: '~/Downloads의 파일을 종류별 폴더로 정리해요',
    script: `#!/bin/zsh
# @msm-name: 다운로드 폴더 정리
# @msm-icon: 🗂️
# @msm-category: 파일
# @msm-description: ~/Downloads의 파일을 확장자별 폴더(이미지/문서/압축파일/기타)로 정리합니다
cd ~/Downloads || exit 1
mkdir -p 이미지 문서 압축파일 기타
moved=0
for f in *; do
  [ -f "$f" ] || continue
  case "\${f:l}" in
    *.jpg|*.jpeg|*.png|*.gif|*.heic|*.webp) mv "$f" 이미지/ ;;
    *.pdf|*.doc|*.docx|*.pages|*.hwp|*.ppt|*.pptx|*.key|*.txt|*.md) mv "$f" 문서/ ;;
    *.zip|*.dmg|*.tar|*.gz) mv "$f" 압축파일/ ;;
    *) mv "$f" 기타/ ;;
  esac
  moved=$((moved + 1))
done
echo "파일 \${moved}개를 정리했어요"
`,
  },
  {
    id: 'organize-desktop',
    name: '바탕화면 정리',
    icon: '🧹',
    category: '파일',
    summary: '바탕화면에 어질러진 파일을 종류별로 정리해요',
    script: `#!/bin/zsh
# @msm-name: 바탕화면 정리
# @msm-icon: 🧹
# @msm-category: 파일
# @msm-description: 바탕화면의 파일을 종류별 폴더(이미지/문서/기타)로 정리합니다
cd ~/Desktop || exit 1
mkdir -p 이미지 문서 기타
moved=0
for f in *; do
  [ -f "$f" ] || continue
  case "\${f:l}" in
    *.jpg|*.jpeg|*.png|*.gif|*.heic|*.webp) mv "$f" 이미지/ ;;
    *.pdf|*.doc|*.docx|*.pages|*.hwp|*.ppt|*.pptx|*.key|*.txt|*.md) mv "$f" 문서/ ;;
    *) mv "$f" 기타/ ;;
  esac
  moved=$((moved + 1))
done
echo "바탕화면 파일 \${moved}개를 정리했어요"
`,
  },
  {
    id: 'open-latest-download',
    name: '방금 다운로드한 파일 찾기',
    icon: '📥',
    category: '파일',
    summary: '가장 최근에 받은 파일을 Finder에서 바로 보여줘요',
    script: `#!/bin/zsh
# @msm-name: 방금 다운로드한 파일 찾기
# @msm-icon: 📥
# @msm-category: 파일
latest=$(ls -t ~/Downloads 2>/dev/null | head -1)
if [ -z "$latest" ]; then
  echo "다운로드 폴더가 비어있어요" >&2
  exit 1
fi
open -R ~/Downloads/"$latest"
echo "방금 받은 파일을 찾았어요: $latest"
`,
  },
  {
    id: 'empty-trash',
    name: '휴지통 비우기',
    icon: '🗑️',
    category: '파일',
    summary: '휴지통을 즉시 비워요',
    script: `#!/bin/zsh
# @msm-name: 휴지통 비우기
# @msm-icon: 🗑️
# @msm-category: 파일
osascript -e 'tell application "Finder" to empty trash'
echo "휴지통을 비웠어요"
`,
  },
  {
    id: 'disk-space',
    name: '저장 공간 확인',
    icon: '💾',
    category: '파일',
    summary: '지금 여유 저장 공간이 얼마나 남았는지 보여줘요',
    script: `#!/bin/zsh
# @msm-name: 저장 공간 확인
# @msm-icon: 💾
# @msm-category: 파일
df -h / | tail -1 | awk '{print "여유 공간 " $4 " / 전체 " $2}'
`,
  },
  {
    id: 'clean-cache',
    name: '캐시 정리해서 용량 확보',
    icon: '🧽',
    category: '파일',
    summary: '앱들이 쌓아둔 캐시를 지워서 저장 공간을 확보해요',
    script: `#!/bin/zsh
# @msm-name: 캐시 정리해서 용량 확보
# @msm-icon: 🧽
# @msm-category: 파일
# @msm-description: ~/Library/Caches를 비웁니다. 다시 켜면 앱이 잠깐 느릴 수 있어요
msm-confirm "캐시를 정리할까요? 앱을 다시 열면 잠깐 느려질 수 있어요" || { echo "취소했어요"; exit 0; }
rm -rf ~/Library/Caches/*
echo "캐시를 정리했어요"
`,
  },

  // ── 화면 ────────────────────────────────────────────────────────────
  {
    id: 'dark-mode-toggle',
    name: '다크모드 토글',
    icon: '🌓',
    category: '화면',
    summary: '시스템 다크모드를 켜고 꺼요',
    script: `#!/bin/zsh
# @msm-name: 다크모드 토글
# @msm-icon: 🌓
# @msm-category: 화면
# @msm-description: macOS 시스템 다크모드를 켜고 끕니다
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'
echo "다크모드를 바꿨어요"
`,
  },
  {
    id: 'lock-screen',
    name: '화면 잠그기',
    icon: '🔒',
    category: '화면',
    summary: '자리를 비울 때 바로 화면을 잠가요',
    script: `#!/bin/zsh
# @msm-name: 화면 잠그기
# @msm-icon: 🔒
# @msm-category: 화면
pmset displaysleepnow
echo "화면을 잠갔어요"
`,
  },
  {
    id: 'start-screensaver',
    name: '화면보호기 시작',
    icon: '🌌',
    category: '화면',
    summary: '지금 바로 화면보호기를 시작해요',
    script: `#!/bin/zsh
# @msm-name: 화면보호기 시작
# @msm-icon: 🌌
# @msm-category: 화면
osascript -e 'tell application "System Events" to start current screen saver'
echo "화면보호기를 시작했어요"
`,
  },
  {
    id: 'screenshot-full-clipboard',
    name: '화면 전체를 클립보드로 캡처',
    icon: '🖼️',
    category: '화면',
    summary: '파일로 저장하지 않고 클립보드에만 담아요',
    script: `#!/bin/zsh
# @msm-name: 화면 전체를 클립보드로 캡처
# @msm-icon: 🖼️
# @msm-category: 화면
screencapture -c
echo "화면 전체를 클립보드에 담았어요"
`,
  },
  {
    id: 'screenshot-region-clipboard',
    name: '영역 선택 캡처 (클립보드)',
    icon: '✂️',
    category: '화면',
    summary: '원하는 영역만 선택해서 클립보드로 캡처해요',
    script: `#!/bin/zsh
# @msm-name: 영역 선택해서 클립보드로 캡처
# @msm-icon: ✂️
# @msm-category: 화면
screencapture -ic
echo "선택한 영역을 클립보드에 담았어요"
`,
  },
  {
    id: 'screenshot-to-preview',
    name: '캡처해서 바로 미리보기로 열기',
    icon: '🖨️',
    category: '화면',
    summary: '캡처한 화면을 바로 미리보기 앱에서 열어요',
    script: `#!/bin/zsh
# @msm-name: 캡처해서 바로 미리보기로 열기
# @msm-icon: 🖨️
# @msm-category: 화면
tmpfile="/tmp/msm-capture-$(date +%s).png"
screencapture -i "$tmpfile"
if [ ! -f "$tmpfile" ]; then
  echo "캡처를 취소했어요"
  exit 0
fi
open -a Preview "$tmpfile"
echo "캡처한 화면을 미리보기로 열었어요"
`,
  },
  {
    id: 'screenshot-location',
    name: '스크린샷 저장 위치 바꾸기',
    icon: '📸',
    category: '화면',
    summary: '스크린샷을 Pictures/Screenshots에 저장하도록 바꿔요',
    script: `#!/bin/zsh
# @msm-name: 스크린샷 저장 위치를 Pictures/Screenshots로 변경
# @msm-icon: 📸
# @msm-category: 화면
mkdir -p ~/Pictures/Screenshots
defaults write com.apple.screencapture location ~/Pictures/Screenshots
killall SystemUIServer
echo "스크린샷 저장 위치를 바꿨어요"
`,
  },
  {
    id: 'desktop-icons-toggle',
    name: '바탕화면 아이콘 보이기/숨기기',
    icon: '🖥️',
    category: '화면',
    summary: '발표하거나 화면 공유할 때 아이콘을 싹 숨겨요',
    script: `#!/bin/zsh
# @msm-name: 바탕화면 아이콘 보이기/숨기기
# @msm-icon: 🖥️
# @msm-category: 화면
current=$(defaults read com.apple.finder CreateDesktop 2>/dev/null)
if [ "$current" = "0" ]; then
  defaults write com.apple.finder CreateDesktop -bool true
  echo "바탕화면 아이콘을 보이게 했어요"
else
  defaults write com.apple.finder CreateDesktop -bool false
  echo "바탕화면 아이콘을 숨겼어요"
fi
killall Finder
`,
  },
  {
    id: 'caffeinate-1h',
    name: '1시간 동안 화면 안 꺼지게 하기',
    icon: '☕',
    category: '화면',
    summary: '발표나 영상 볼 때 화면이 꺼지지 않게 해요',
    script: `#!/bin/zsh
# @msm-name: 1시간 동안 화면 안 꺼지게 하기
# @msm-icon: ☕
# @msm-category: 화면
# @msm-description: 화면이 꺼지지 않도록 1시간 동안 막습니다 (백그라운드로 실행되고 이 스크립트는 바로 끝납니다)
nohup caffeinate -d -t 3600 > /dev/null 2>&1 &
disown
echo "1시간 동안 화면이 꺼지지 않게 해뒀어요"
`,
  },

  // ── 소리 ────────────────────────────────────────────────────────────
  {
    id: 'mute-toggle',
    name: '음소거 토글',
    icon: '🔇',
    category: '소리',
    summary: '소리를 껐다 켰다 해요',
    script: `#!/bin/zsh
# @msm-name: 음소거 토글
# @msm-icon: 🔇
# @msm-category: 소리
osascript -e 'set volume output muted (not (output muted of (get volume settings)))'
echo "음소거 상태를 바꿨어요"
`,
  },
  {
    id: 'set-volume',
    name: '볼륨을 원하는 값으로 맞추기',
    icon: '🔊',
    category: '소리',
    summary: '숫자만 입력하면 그 값으로 바로 맞춰요',
    script: `#!/bin/zsh
# @msm-name: 볼륨을 원하는 값으로 맞추기
# @msm-icon: 🔊
# @msm-category: 소리
level=$(msm-ask "볼륨을 몇 %로 맞출까요? (0~100)")
if [ -z "$level" ]; then
  echo "취소했어요"
  exit 0
fi
osascript - "$level" <<'APPLESCRIPT'
on run argv
  set volume output volume (item 1 of argv as integer)
end run
APPLESCRIPT
echo "볼륨을 $level%로 맞췄어요"
`,
  },
  {
    id: 'now-playing',
    name: '재생 중인 곡 정보 복사',
    icon: '🎵',
    category: '소리',
    summary: 'Music 앱에서 재생 중인 곡 제목/아티스트를 복사해요',
    script: `#!/bin/zsh
# @msm-name: 재생 중인 곡 정보 복사
# @msm-icon: 🎵
# @msm-category: 소리
info=$(osascript -e 'tell application "Music"
  if it is running and player state is playing then
    return (name of current track) & " - " & (artist of current track)
  else
    return ""
  end if
end tell' 2>/dev/null)
if [ -z "$info" ]; then
  echo "지금 재생 중인 곡이 없어요"
  exit 0
fi
echo -n "$info" | pbcopy
echo "$info"
`,
  },

  // ── 인터넷 ──────────────────────────────────────────────────────────
  {
    id: 'wifi-restart',
    name: '인터넷 안 될 때 Wi-Fi 재연결',
    icon: '🔄',
    category: '인터넷',
    summary: 'Wi-Fi를 껐다 켜서 연결 문제를 해결해봐요',
    script: `#!/bin/zsh
# @msm-name: 인터넷 안 될 때 Wi-Fi 재연결
# @msm-icon: 🔄
# @msm-category: 인터넷
# @msm-description: Wi-Fi 인터페이스가 en0이 아니면 networksetup -listallhardwareports로 이름을 확인해서 바꾸세요
networksetup -setairportpower en0 off
sleep 2
networksetup -setairportpower en0 on
echo "Wi-Fi를 껐다가 다시 켰어요"
`,
  },
  {
    id: 'wifi-password',
    name: '지금 연결된 Wi-Fi 비밀번호 확인',
    icon: '🔑',
    category: '인터넷',
    summary: '와이파이 비밀번호를 잊어버렸을 때 바로 확인해요',
    script: `#!/bin/zsh
# @msm-name: 지금 연결된 Wi-Fi 비밀번호 확인
# @msm-icon: 🔑
# @msm-category: 인터넷
# @msm-description: 처음 실행하면 키체인 접근 허용 창이 떠요 — 허용을 눌러주세요
ssid=$(networksetup -getairportnetwork en0 | sed 's/.*: //')
if [ -z "$ssid" ] || [[ "$ssid" == *"not associated"* ]] || [[ "$ssid" == *"연결"* ]]; then
  echo "지금 연결된 Wi-Fi가 없어요" >&2
  exit 1
fi
password=$(security find-generic-password -D "AirPort network password" -a "$ssid" -w 2>/dev/null)
if [ -z "$password" ]; then
  echo "비밀번호를 찾지 못했어요" >&2
  exit 1
fi
echo -n "$password" | pbcopy
echo "$ssid 비밀번호를 클립보드에 복사했어요"
`,
  },
  {
    id: 'ip-address',
    name: 'IP 주소 확인',
    icon: '🌐',
    category: '인터넷',
    summary: '내 IP 주소를 확인해서 클립보드에 복사해요 (와이파이 문의할 때 유용)',
    script: `#!/bin/zsh
# @msm-name: IP 주소 확인
# @msm-icon: 🌐
# @msm-category: 인터넷
local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
public_ip=$(curl -s --max-time 5 https://api.ipify.org)
[ -z "$public_ip" ] && public_ip="확인 못함(인터넷 연결을 확인해보세요)"
result="로컬: $local_ip / 공인: $public_ip"
echo -n "$result" | pbcopy
echo "$result"
`,
  },

  // ── 클립보드 ────────────────────────────────────────────────────────
  {
    id: 'clipboard-uppercase',
    name: '클립보드 텍스트 대문자로',
    icon: '🔠',
    category: '클립보드',
    summary: '복사해둔 영어 텍스트를 대문자로 바꿔요',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 대문자로
# @msm-icon: 🔠
# @msm-category: 클립보드
pbpaste | tr '[:lower:]' '[:upper:]' | pbcopy
echo "대문자로 바꿨어요"
`,
  },
  {
    id: 'clipboard-lowercase',
    name: '클립보드 텍스트 소문자로',
    icon: '🔡',
    category: '클립보드',
    summary: '복사해둔 영어 텍스트를 소문자로 바꿔요',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 소문자로
# @msm-icon: 🔡
# @msm-category: 클립보드
pbpaste | tr '[:upper:]' '[:lower:]' | pbcopy
echo "소문자로 바꿨어요"
`,
  },
  {
    id: 'clipboard-single-line',
    name: '클립보드 텍스트 한 줄로 합치기',
    icon: '➡️',
    category: '클립보드',
    summary: '줄바꿈 많은 텍스트를 깔끔하게 한 줄로 만들어요',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 한 줄로 합치기
# @msm-icon: ➡️
# @msm-category: 클립보드
pbpaste | tr '\\n' ' ' | tr -s ' ' | sed 's/^ *//;s/ *$//' | pbcopy
echo "한 줄로 합쳤어요"
`,
  },
  {
    id: 'clipboard-markdown-link',
    name: 'URL로 마크다운 링크 만들기',
    icon: '🔗',
    category: '클립보드',
    summary: '복사한 링크에 제목을 붙여서 노션/옵시디언용 링크로 만들어요',
    script: `#!/bin/zsh
# @msm-name: 클립보드 URL로 마크다운 링크 만들기
# @msm-icon: 🔗
# @msm-category: 클립보드
# @msm-description: 클립보드의 URL과 입력한 제목으로 [제목](URL) 형식을 만들어 다시 클립보드에 넣습니다
url=$(pbpaste)
title=$(msm-ask "링크 제목을 입력하세요")
if [ -z "$title" ]; then
  echo "취소했어요"
  exit 0
fi
echo -n "[$title]($url)" | pbcopy
echo "[$title]($url)"
`,
  },

  // ── 정보 ────────────────────────────────────────────────────────────
  {
    id: 'battery-status',
    name: '배터리 상태 확인',
    icon: '🔋',
    category: '정보',
    summary: '지금 배터리가 몇 % 남았는지 바로 확인해요',
    script: `#!/bin/zsh
# @msm-name: 배터리 상태 확인
# @msm-icon: 🔋
# @msm-category: 정보
# @msm-description: 현재 배터리 잔량과 충전 상태를 알림으로 보여줍니다
pmset -g batt | grep -Eo "[0-9]+%.*"
`,
  },
];

// A preset group installs several single-script presets in one action and
// tags each with the same `@msm-group`, so the manager sidebar can show them
// as one folder (Manager.tsx's folder view — only rendered once 2+ installed
// shortcuts share a group, never a standalone concept of its own here).
export interface PresetGroup {
  id: string;
  name: string;
  icon: string;
  category: string;
  summary: string;
  presets: Preset[];
}

export function isPresetGroup(entry: Preset | PresetGroup): entry is PresetGroup {
  return 'presets' in entry;
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'gtd-work-tracker',
    name: '업무 관리 (GTD)',
    icon: '🚩',
    category: '업무 관리',
    summary:
      '등록 → 시작 → 완료로 하루 업무를 미리알림에 기록하고, 소요시간까지 자동으로 남겨 팀과 공유해요. 단축어 7개가 한 번에 설치돼요.',
    presets: [
      {
        id: 'gtd-register',
        name: '업무 등록',
        icon: '📥',
        category: '업무 관리',
        summary: '할 일을 등록해요 — 어느 프로젝트인지만 고르면 끝',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+1
# @msm-name: 업무 등록
# @msm-icon: 📥
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 할 일을 등록합니다. 어디 프로젝트에 속하는지만 고르면 끝 — 오늘 할지는 나중에 "시작"(Alt+2)에서 정해요. 기존에 쓰던 다른 미리알림 리스트는 건드리지 않아요 — 이 시스템은 "📥"/"🗂" 접두사가 붙은 리스트만 씁니다.

INBOX="📥 Inbox"

title=$(msm-ask "무엇을 할까요?")
if [ -z "$title" ]; then
  echo "취소했어요"
  exit 0
fi

own_lists_raw=$(osascript <<'APPLESCRIPT'
tell application "Reminders"
  set out to {}
  repeat with l in lists
    set ln to name of l
    if ln starts with "📥" or ln starts with "🗂" then
      set end of out to ln
    end if
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return out as string
APPLESCRIPT
)

own_lists=()
has_inbox="false"
while IFS= read -r ln; do
  if [ -n "$ln" ]; then
    own_lists+=("$ln")
    [ "$ln" = "$INBOX" ] && has_inbox="true"
  fi
done <<< "$own_lists_raw"

# Inbox가 아직 없으면 만든다 (최초 1회뿐 — 목록 조회에 묻어가서 별도 확인 왕복이 없다)
if [ "$has_inbox" != "true" ]; then
  osascript - "$INBOX" <<'APPLESCRIPT' >/dev/null
on run argv
  set n to item 1 of argv
  tell application "Reminders" to make new list with properties {name:n}
end run
APPLESCRIPT
  own_lists=("$INBOX" "\${own_lists[@]}")
fi

if [ \${#own_lists[@]} -le 1 ]; then
  project="$INBOX"
else
  project=$(msm-choose "어디에 등록할까요?" "\${own_lists[@]}")
  [ -z "$project" ] && project="$INBOX"
fi

osascript - "$title" "$project" <<'APPLESCRIPT' >/dev/null
on run argv
  set t to item 1 of argv
  set p to item 2 of argv
  tell application "Reminders"
    make new reminder at list p with properties {name:t}
  end tell
end run
APPLESCRIPT

echo "등록했어요: \${title} (\${project})"
`,
      },
      {
        id: 'gtd-start',
        name: '업무 시작',
        icon: '▶️',
        category: '업무 관리',
        summary: '등록해둔 일 중 지금 손대는 걸 시작으로 표시해요 (여러 개 동시 가능)',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+2
# @msm-name: 업무 시작
# @msm-icon: ▶️
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 등록해둔 일 중 지금 손을 대는 것을 고릅니다. 여러 번 눌러 여러 건을 동시에 진행중으로 둘 수 있어요. 미리알림의 알림 배너가 "시작했다"는 확인 알림 역할을 대신 해줘요.

data=$(osascript <<'APPLESCRIPT'
tell application "Reminders"
  set ownLists to {}
  repeat with l in lists
    set ln to name of l
    if ln starts with "📥" or ln starts with "🗂" then
      set end of ownLists to l
    end if
  end repeat
  set out to {}
  repeat with L in ownLists
    set nms to name of every reminder of L
    set cds to completed of every reminder of L
    set dds to due date of every reminder of L
    repeat with i from 1 to count of nms
      if (item i of cds) is false then
        if (item i of dds) is missing value then
          set end of out to "W|" & (item i of nms)
        else
          set end of out to "O|" & (item i of nms)
        end if
      end if
    end repeat
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return out as string
APPLESCRIPT
)

waiting_names=()
ongoing_count=0
while IFS='|' read -r tag nm; do
  case "$tag" in
    W) waiting_names+=("$nm") ;;
    O) ongoing_count=$((ongoing_count + 1)) ;;
  esac
done <<< "$data"

if [ \${#waiting_names[@]} -eq 0 ]; then
  echo "아직 등록한 일이 없어요 — Alt+1로 먼저 등록해보세요"
  exit 0
fi

if [ "$ongoing_count" -ge 3 ]; then
  msm-confirm "지금 \${ongoing_count}개 진행중이에요. 하나 더 시작할까요?" || { echo "취소했어요"; exit 0; }
fi

chosen=$(msm-choose "무엇을 시작할까요?" "\${waiting_names[@]}")
if [ -z "$chosen" ]; then
  echo "취소했어요"
  exit 0
fi

osascript - "$chosen" <<'APPLESCRIPT' >/dev/null
on run argv
  set nm to item 1 of argv
  tell application "Reminders"
    set ownLists to {}
    repeat with l in lists
      set ln to name of l
      if ln starts with "📥" or ln starts with "🗂" then
        set end of ownLists to l
      end if
    end repeat
    repeat with L in ownLists
      set matches to (every reminder of L whose name is nm and completed is false)
      if (count of matches) > 0 then
        set due date of (item 1 of matches) to (current date)
        exit repeat
      end if
    end repeat
  end tell
end run
APPLESCRIPT

now_label=$(date "+%H:%M")
echo "시작했어요: \${chosen} (\${now_label})"
`,
      },
      {
        id: 'gtd-complete',
        name: '업무 완료',
        icon: '✅',
        category: '업무 관리',
        summary: '시작해둔 일 중 끝난 걸 닫아요 — 소요시간이 자동으로 남아요',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+3
# @msm-name: 업무 완료
# @msm-icon: ✅
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 진행중인 일 중 끝난 것을 골라 닫습니다. 시작(Alt+2)한 것만 목록에 나오고, 완료하면 소요시간이 자동으로 기록돼요.

data=$(osascript <<'APPLESCRIPT'
tell application "Reminders"
  set ownLists to {}
  repeat with l in lists
    set ln to name of l
    if ln starts with "📥" or ln starts with "🗂" then
      set end of ownLists to l
    end if
  end repeat
  set out to {}
  repeat with L in ownLists
    set nms to name of every reminder of L
    set cds to completed of every reminder of L
    set dds to due date of every reminder of L
    repeat with i from 1 to count of nms
      if (item i of cds) is false and (item i of dds) is not missing value then
        set end of out to (item i of nms)
      end if
    end repeat
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return out as string
APPLESCRIPT
)

if [ -z "$data" ]; then
  echo "아직 시작한 일이 없어요 — Alt+2로 먼저 시작해보세요"
  exit 0
fi

ongoing_names=()
while IFS= read -r nm; do
  [ -n "$nm" ] && ongoing_names+=("$nm")
done <<< "$data"

chosen=$(msm-choose "무엇을 완료할까요?" "\${ongoing_names[@]}")
if [ -z "$chosen" ]; then
  echo "취소했어요"
  exit 0
fi

diff_sec=$(osascript - "$chosen" <<'APPLESCRIPT'
on run argv
  set nm to item 1 of argv
  tell application "Reminders"
    set ownLists to {}
    repeat with l in lists
      set ln to name of l
      if ln starts with "📥" or ln starts with "🗂" then
        set end of ownLists to l
      end if
    end repeat
    repeat with L in ownLists
      set matches to (every reminder of L whose name is nm and completed is false)
      if (count of matches) > 0 then
        set r to item 1 of matches
        set startD to due date of r
        set completed of r to true
        set endD to completion date of r
        return (endD - startD) as string
      end if
    end repeat
  end tell
  return "0"
end run
APPLESCRIPT
)

hours=$((diff_sec / 3600))
mins=$(( (diff_sec % 3600) / 60 ))
if [ "$hours" -gt 0 ]; then
  dur="\${hours}시간 \${mins}분"
else
  dur="\${mins}분"
fi

echo "완료했어요: \${chosen} (\${dur}) 🎉"
`,
      },
      {
        id: 'gtd-status',
        name: '업무 현황보기',
        icon: '📊',
        category: '업무 관리',
        summary: '대기·진행중·오늘 완료가 몇 건인지 한눈에 확인해요',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+4
# @msm-name: 업무 현황보기
# @msm-icon: 📊
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 지금 대기·진행중·오늘 완료가 몇 건인지 한눈에 보여줍니다.

data=$(osascript <<'APPLESCRIPT'
tell application "Reminders"
  set ownLists to {}
  repeat with l in lists
    set ln to name of l
    if ln starts with "📥" or ln starts with "🗂" then
      set end of ownLists to l
    end if
  end repeat
  set out to {}
  repeat with L in ownLists
    set nms to name of every reminder of L
    set cds to completed of every reminder of L
    set dds to due date of every reminder of L
    set eds to completion date of every reminder of L
    set todayStart to (current date) - (time of (current date))
    repeat with i from 1 to count of nms
      if (item i of cds) is false then
        if (item i of dds) is missing value then
          set end of out to "W|" & (item i of nms)
        else
          set diffSec to (current date) - (item i of dds)
          set end of out to "O|" & (item i of nms) & "|" & diffSec
        end if
      else
        set ed to item i of eds
        if ed is not missing value and ed ≥ todayStart then
          set end of out to "D|" & (item i of nms)
        end if
      end if
    end repeat
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return out as string
APPLESCRIPT
)

waiting=0
ongoing=0
done_today=0
detail=""
while IFS='|' read -r tag nm sec; do
  case "$tag" in
    W) waiting=$((waiting + 1)) ;;
    D) done_today=$((done_today + 1)) ;;
    O)
      ongoing=$((ongoing + 1))
      h=$((sec / 3600)); m=$(( (sec % 3600) / 60 ))
      if [ "$h" -gt 0 ]; then dur="\${h}시간 \${m}분째"; else dur="\${m}분째"; fi
      detail="\${detail}· \${nm} (\${dur})
"
      ;;
  esac
done <<< "$data"
detail="\${detail%$'\\n'}"

summary="진행중 \${ongoing}개 · 완료 \${done_today}개 · 대기 \${waiting}개"
if [ "$ongoing" -gt 0 ] && [ "$ongoing" -le 3 ]; then
  echo "\${summary}
\${detail}"
else
  echo "$summary"
fi
`,
      },
      {
        id: 'gtd-share',
        name: '업무 공유하기',
        icon: '📤',
        category: '업무 관리',
        summary: '오늘 완료·진행중·대기 현황을 소요시간과 함께 클립보드로 복사해요',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+5
# @msm-name: 업무 공유하기
# @msm-icon: 📤
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 오늘 완료·진행중·대기 현황을 소요시간과 함께 정리해 클립보드에 복사합니다. 팀 채널에 붙여넣기만 하면 돼요. 매일 18:00에 자동으로도 실행돼요.
# @msm-trigger: schedule 18:00

# Slack Incoming Webhook을 쓰고 싶으면 아래에 URL을 넣으세요 (비워두면 클립보드 복사만 해요)
SLACK_WEBHOOK_URL=""

fmt_dur() {
  local sec=$1
  local h=$((sec / 3600))
  local m=$(( (sec % 3600) / 60 ))
  if [ "$h" -gt 0 ]; then
    echo "\${h}시간 \${m}분"
  else
    echo "\${m}분"
  fi
}

data=$(osascript <<'APPLESCRIPT'
tell application "Reminders"
  set ownLists to {}
  repeat with l in lists
    set ln to name of l
    if ln starts with "📥" or ln starts with "🗂" then
      set end of ownLists to l
    end if
  end repeat
  set todayStart to (current date) - (time of (current date))
  set out to {}
  repeat with L in ownLists
    set nms to name of every reminder of L
    set cds to completed of every reminder of L
    set dds to due date of every reminder of L
    set eds to completion date of every reminder of L
    repeat with i from 1 to count of nms
      set nm to item i of nms
      if (item i of cds) is true then
        set ed to item i of eds
        if ed is not missing value and ed ≥ todayStart then
          set sd to item i of dds
          if sd is missing value then
            set diffSec to 0
          else
            set diffSec to ed - sd
          end if
          set end of out to "D|" & nm & "|" & diffSec
        end if
      else
        set sd to item i of dds
        if sd is missing value then
          set end of out to "W|" & nm
        else
          set diffSec to (current date) - sd
          set end of out to "O|" & nm & "|" & diffSec
        end if
      end if
    end repeat
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return out as string
APPLESCRIPT
)

done_lines=""; done_count=0
ongoing_lines=""; ongoing_count=0
waiting_lines=""; waiting_count=0

while IFS='|' read -r tag nm sec; do
  [ -z "$tag" ] && continue
  case "$tag" in
    D)
      done_count=$((done_count + 1))
      done_lines="\${done_lines}- \${nm} ($(fmt_dur "$sec"))
"
      ;;
    O)
      ongoing_count=$((ongoing_count + 1))
      ongoing_lines="\${ongoing_lines}- \${nm} ($(fmt_dur "$sec")째)
"
      ;;
    W)
      waiting_count=$((waiting_count + 1))
      waiting_lines="\${waiting_lines}- \${nm}
"
      ;;
  esac
done <<< "$data"

who=$(id -F 2>/dev/null)
[ -z "$who" ] && who=$(whoami)
dow_kr=(일 월 화 수 목 금 토)
dow_idx=$(date "+%w")
today_label="$(date "+%-m/%-d")(\${dow_kr[$((dow_idx + 1))]})"

report="📅 \${today_label} 진행 현황 — \${who}
✅ 완료 \${done_count}
\${done_lines}🌀 진행중 \${ongoing_count}
\${ongoing_lines}🗂 대기 \${waiting_count}
\${waiting_lines}"

echo -n "$report" | pbcopy

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  payload=$(printf '%s' "$report" | python3 -c 'import json,sys;print(json.dumps({"text":sys.stdin.read()}))')
  slack_status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST -H "Content-Type: application/json" -d "$payload" "$SLACK_WEBHOOK_URL")
  if [ "$slack_status" = "200" ]; then
    echo "오늘 진행 현황을 클립보드에 복사하고 Slack에도 올렸어요"
  else
    echo "클립보드에는 복사했지만 Slack 전송은 실패했어요 (상태 코드 \${slack_status:-없음}) — Webhook 주소를 확인해보세요"
  fi
else
  echo "오늘 진행 현황을 클립보드에 복사했어요 — 팀 채널에 붙여넣기(⌘V)만 하면 돼요"
fi
`,
      },
      {
        id: 'gtd-project',
        name: '프로젝트 등록',
        icon: '🚀',
        category: '업무 관리',
        summary: '새 프로젝트(미리알림 리스트)를 만들어요',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+6
# @msm-name: 프로젝트 등록
# @msm-icon: 🚀
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 새 프로젝트(미리알림 리스트)를 만듭니다. 이름 앞에 "🗂 "를 자동으로 붙여요 — 이 표시가 있는 리스트만 업무 시스템이 스캔합니다. 이후 "업무 등록"(Alt+1)의 선택지에 바로 나타나요.

raw_name=$(msm-ask "프로젝트 이름을 입력하세요")
if [ -z "$raw_name" ]; then
  echo "취소했어요"
  exit 0
fi

name="🗂 \${raw_name}"

exists=$(osascript - "$name" <<'APPLESCRIPT'
on run argv
  set n to item 1 of argv
  tell application "Reminders"
    return (exists list n)
  end tell
end run
APPLESCRIPT
)

if [ "$exists" = "true" ]; then
  echo "이미 있는 프로젝트예요: \${name}"
  exit 0
fi

osascript - "$name" <<'APPLESCRIPT' >/dev/null
on run argv
  set n to item 1 of argv
  tell application "Reminders" to make new list with properties {name:n}
end run
APPLESCRIPT

echo "프로젝트를 만들었어요: \${name}"
`,
      },
      {
        id: 'gtd-normalize',
        name: '업무 구조 정규화',
        icon: '🧭',
        category: '업무 관리',
        summary: 'Inbox 리스트가 있는지 확인하고, 없을 때만 만들어요 (되돌리기 어려운 변경은 안 함)',
        script: `#!/bin/zsh
# @msm-hotkey: Alt+0
# @msm-name: 업무 구조 정규화
# @msm-icon: 🧭
# @msm-category: 업무 관리
# @msm-group: 업무 관리
# @msm-description: 업무 시스템에 필요한 Inbox 리스트가 있는지 확인하고, 없을 때만 만들어요. 이미 되어 있으면 아무것도 묻지 않고 조용히 끝나요. 기존에 쓰던 다른 미리알림 리스트는 절대 건드리지 않아요.

INBOX="📥 Inbox"

has_inbox=$(osascript - "$INBOX" <<'APPLESCRIPT'
on run argv
  set n to item 1 of argv
  tell application "Reminders"
    return (exists list n)
  end tell
end run
APPLESCRIPT
)

if [ "$has_inbox" = "true" ]; then
  echo "이미 잘 되어 있어요 — 바꿀 게 없어요"
  exit 0
fi

msm-confirm "업무 시스템에 필요한 Inbox 리스트가 아직 없어요. 만들까요?" || { echo "취소했어요"; exit 0; }

osascript - "$INBOX" <<'APPLESCRIPT' >/dev/null
on run argv
  set n to item 1 of argv
  tell application "Reminders" to make new list with properties {name:n}
end run
APPLESCRIPT

echo "Inbox 리스트를 만들었어요"
`,
      },
    ],
  },
];
