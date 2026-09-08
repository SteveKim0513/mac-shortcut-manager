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
public_ip=$(curl -s https://api.ipify.org)
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
