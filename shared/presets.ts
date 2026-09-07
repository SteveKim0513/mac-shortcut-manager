export interface Preset {
  id: string;
  name: string;
  icon: string;
  category: string;
  summary: string;
  /** Full .sh file content, ready to save as-is. */
  script: string;
}

// Curated, hand-verified — not auto-collected. Each one is a complete,
// working .sh file using only the directives/helpers this app already
// supports (no new execution model, per PRINCIPLES.md).
export const PRESETS: Preset[] = [
  // ── 시스템 ──────────────────────────────────────────────────────────
  {
    id: 'dark-mode-toggle',
    name: '다크모드 토글',
    icon: '🌓',
    category: '시스템',
    summary: '시스템 다크모드를 켜고 끕니다',
    script: `#!/bin/zsh
# @msm-name: 다크모드 토글
# @msm-icon: 🌓
# @msm-category: 시스템
# @msm-description: macOS 시스템 다크모드를 켜고 끕니다
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'
`,
  },
  {
    id: 'lock-screen',
    name: '화면 잠그기',
    icon: '🔒',
    category: '시스템',
    summary: '즉시 화면을 잠급니다',
    script: `#!/bin/zsh
# @msm-name: 화면 잠그기
# @msm-icon: 🔒
# @msm-category: 시스템
# @msm-description: 즉시 화면을 잠급니다
pmset displaysleepnow
`,
  },
  {
    id: 'start-screensaver',
    name: '화면보호기 시작',
    icon: '🌌',
    category: '시스템',
    summary: '지금 바로 화면보호기를 시작합니다',
    script: `#!/bin/zsh
# @msm-name: 화면보호기 시작
# @msm-icon: 🌌
# @msm-category: 시스템
# @msm-description: 지금 바로 화면보호기를 시작합니다
osascript -e 'tell application "System Events" to start current screen saver'
`,
  },
  {
    id: 'stage-manager-toggle',
    name: 'Stage Manager 토글',
    icon: '🪟',
    category: '시스템',
    summary: 'Stage Manager를 켜고 끕니다',
    script: `#!/bin/zsh
# @msm-name: Stage Manager 토글
# @msm-icon: 🪟
# @msm-category: 시스템
# @msm-description: Stage Manager를 켜고 끕니다
current=$(defaults read com.apple.WindowManager GloballyEnabled 2>/dev/null)
if [ "$current" = "1" ]; then
  defaults write com.apple.WindowManager GloballyEnabled -bool false
  echo "Stage Manager 끔"
else
  defaults write com.apple.WindowManager GloballyEnabled -bool true
  echo "Stage Manager 켬"
fi
killall Dock
`,
  },
  {
    id: 'dock-instant',
    name: 'Dock 즉시 표시',
    icon: '🚀',
    category: '시스템',
    summary: 'Dock이 마우스를 대자마자 바로 나타나게 합니다',
    script: `#!/bin/zsh
# @msm-name: Dock 즉시 표시
# @msm-icon: 🚀
# @msm-category: 시스템
# @msm-description: Dock 자동 숨김 지연을 없애서 바로 나타나게 합니다
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock autohide-time-modifier -float 0.15
killall Dock
echo "Dock 즉시 표시로 변경"
`,
  },
  {
    id: 'dock-restore',
    name: 'Dock 기본 속도로 복원',
    icon: '🐢',
    category: '시스템',
    summary: 'Dock 자동 숨김 지연을 기본값으로 되돌립니다',
    script: `#!/bin/zsh
# @msm-name: Dock 기본 속도로 복원
# @msm-icon: 🐢
# @msm-category: 시스템
defaults delete com.apple.dock autohide-delay 2>/dev/null
defaults delete com.apple.dock autohide-time-modifier 2>/dev/null
killall Dock
echo "Dock 기본값으로 복원"
`,
  },
  {
    id: 'wifi-toggle',
    name: 'Wi-Fi 켜기/끄기',
    icon: '📶',
    category: '시스템',
    summary: 'Wi-Fi를 켜고 끕니다',
    script: `#!/bin/zsh
# @msm-name: Wi-Fi 켜기/끄기
# @msm-icon: 📶
# @msm-category: 시스템
# @msm-description: Wi-Fi 인터페이스가 en0이 아니면 networksetup -listallhardwareports로 이름을 확인해서 바꾸세요
state=$(networksetup -getairportpower en0 | awk '{print $NF}')
if [ "$state" = "On" ]; then
  networksetup -setairportpower en0 off
  echo "Wi-Fi 끔"
else
  networksetup -setairportpower en0 on
  echo "Wi-Fi 켬"
fi
`,
  },
  {
    id: 'bluetooth-toggle',
    name: '블루투스 켜기/끄기',
    icon: '🔵',
    category: '시스템',
    summary: 'blueutil이 설치되어 있어야 동작합니다 (brew install blueutil)',
    script: `#!/bin/zsh
# @msm-name: 블루투스 켜기/끄기
# @msm-icon: 🔵
# @msm-category: 시스템
# @msm-description: blueutil 필요 — 없으면: brew install blueutil
if ! command -v blueutil >/dev/null 2>&1; then
  echo "blueutil이 필요합니다: brew install blueutil" >&2
  exit 1
fi
if [ "$(blueutil -p)" = "1" ]; then
  blueutil -p 0
  echo "블루투스 끔"
else
  blueutil -p 1
  echo "블루투스 켬"
fi
`,
  },
  {
    id: 'caffeinate-1h',
    name: '1시간 동안 잠자기 방지',
    icon: '☕',
    category: '시스템',
    summary: '화면이 꺼지지 않도록 1시간 동안 막습니다',
    script: `#!/bin/zsh
# @msm-name: 1시간 동안 잠자기 방지
# @msm-icon: ☕
# @msm-category: 시스템
# @msm-description: 화면이 꺼지지 않도록 1시간 동안 막습니다 (백그라운드로 실행되고 이 스크립트는 바로 끝납니다)
nohup caffeinate -d -t 3600 > /dev/null 2>&1 &
disown
echo "1시간 동안 화면이 꺼지지 않습니다"
`,
  },
  {
    id: 'battery-status',
    name: '배터리 상태 확인',
    icon: '🔋',
    category: '시스템',
    summary: '현재 배터리 잔량과 충전 상태를 보여줍니다',
    script: `#!/bin/zsh
# @msm-name: 배터리 상태 확인
# @msm-icon: 🔋
# @msm-category: 시스템
# @msm-description: 현재 배터리 잔량과 충전 상태를 알림으로 보여줍니다
pmset -g batt | grep -Eo "[0-9]+%.*"
`,
  },
  {
    id: 'system-summary',
    name: '시스템 정보 요약',
    icon: 'ℹ️',
    category: '시스템',
    summary: 'macOS 버전과 가동 시간을 보여줍니다',
    script: `#!/bin/zsh
# @msm-name: 시스템 정보 요약
# @msm-icon: ℹ️
# @msm-category: 시스템
echo "macOS $(sw_vers -productVersion) · $(uptime | sed 's/.*up //;s/,.*//') 가동중"
`,
  },
  {
    id: 'mute-toggle',
    name: '음소거 토글',
    icon: '🔇',
    category: '시스템',
    summary: '시스템 음소거를 켜고 끕니다',
    script: `#!/bin/zsh
# @msm-name: 음소거 토글
# @msm-icon: 🔇
# @msm-category: 시스템
osascript -e 'set volume output muted (not (output muted of (get volume settings)))'
`,
  },

  // ── Finder ──────────────────────────────────────────────────────────
  {
    id: 'hidden-files-toggle',
    name: '숨김 파일 보기 토글',
    icon: '🙈',
    category: 'Finder',
    summary: 'Finder에서 숨김 파일을 보이거나 다시 숨깁니다',
    script: `#!/bin/zsh
# @msm-name: 숨김 파일 보기 토글
# @msm-icon: 🙈
# @msm-category: Finder
# @msm-description: Finder에서 숨김 파일을 보이거나 다시 숨깁니다
current=$(defaults read com.apple.finder AppleShowAllFiles 2>/dev/null)
if [ "$current" = "1" ] || [ "$current" = "YES" ] || [ "$current" = "true" ]; then
  defaults write com.apple.finder AppleShowAllFiles -bool false
  echo "숨김 파일 다시 숨김"
else
  defaults write com.apple.finder AppleShowAllFiles -bool true
  echo "숨김 파일 표시함"
fi
killall Finder
`,
  },
  {
    id: 'desktop-icons-toggle',
    name: '데스크탑 아이콘 보이기/숨기기',
    icon: '🖥️',
    category: 'Finder',
    summary: '데스크탑 아이콘을 전부 숨기거나 다시 보여줍니다',
    script: `#!/bin/zsh
# @msm-name: 데스크탑 아이콘 보이기/숨기기
# @msm-icon: 🖥️
# @msm-category: Finder
current=$(defaults read com.apple.finder CreateDesktop 2>/dev/null)
if [ "$current" = "0" ]; then
  defaults write com.apple.finder CreateDesktop -bool true
  echo "데스크탑 아이콘 표시함"
else
  defaults write com.apple.finder CreateDesktop -bool false
  echo "데스크탑 아이콘 숨김"
fi
killall Finder
`,
  },
  {
    id: 'empty-trash',
    name: '휴지통 비우기',
    icon: '🗑️',
    category: 'Finder',
    summary: '휴지통을 즉시 비웁니다',
    script: `#!/bin/zsh
# @msm-name: 휴지통 비우기
# @msm-icon: 🗑️
# @msm-category: Finder
osascript -e 'tell application "Finder" to empty trash'
echo "휴지통을 비웠습니다"
`,
  },
  {
    id: 'organize-downloads',
    name: '다운로드 폴더 정리',
    icon: '🗂️',
    category: 'Finder',
    summary: '~/Downloads의 파일을 종류별 폴더로 정리합니다',
    script: `#!/bin/zsh
# @msm-name: 다운로드 폴더 정리
# @msm-icon: 🗂️
# @msm-category: Finder
# @msm-description: ~/Downloads의 파일을 확장자별 폴더(이미지/문서/압축파일/기타)로 정리합니다
cd ~/Downloads || exit 1
mkdir -p 이미지 문서 압축파일 기타
moved=0
for f in *; do
  [ -f "$f" ] || continue
  case "\${f:l}" in
    *.jpg|*.jpeg|*.png|*.gif|*.heic|*.webp) mv "$f" 이미지/ ;;
    *.pdf|*.doc|*.docx|*.pages|*.txt|*.md) mv "$f" 문서/ ;;
    *.zip|*.dmg|*.tar|*.gz) mv "$f" 압축파일/ ;;
    *) mv "$f" 기타/ ;;
  esac
  moved=$((moved + 1))
done
echo "$moved개 파일 정리 완료"
`,
  },
  {
    id: 'screenshot-location',
    name: '스크린샷 저장 위치 변경',
    icon: '📸',
    category: 'Finder',
    summary: '스크린샷을 ~/Pictures/Screenshots에 저장하도록 바꿉니다',
    script: `#!/bin/zsh
# @msm-name: 스크린샷 저장 위치를 Pictures/Screenshots로 변경
# @msm-icon: 📸
# @msm-category: Finder
mkdir -p ~/Pictures/Screenshots
defaults write com.apple.screencapture location ~/Pictures/Screenshots
killall SystemUIServer
echo "스크린샷 저장 위치 변경됨"
`,
  },
  {
    id: 'screenshot-full-clipboard',
    name: '화면 전체를 클립보드로 캡처',
    icon: '🖼️',
    category: 'Finder',
    summary: '파일로 저장하지 않고 클립보드에만 캡처합니다',
    script: `#!/bin/zsh
# @msm-name: 화면 전체를 클립보드로 캡처
# @msm-icon: 🖼️
# @msm-category: Finder
screencapture -c
`,
  },
  {
    id: 'screenshot-region-clipboard',
    name: '영역 선택 캡처 (클립보드)',
    icon: '✂️',
    category: 'Finder',
    summary: '영역을 선택해서 클립보드로 캡처합니다',
    script: `#!/bin/zsh
# @msm-name: 영역 선택해서 클립보드로 캡처
# @msm-icon: ✂️
# @msm-category: Finder
screencapture -ic
`,
  },
  {
    id: 'finder-folder-in-terminal',
    name: 'Finder 현재 폴더를 터미널로 열기',
    icon: '💻',
    category: 'Finder',
    summary: '맨 앞 Finder 창의 폴더를 터미널에서 엽니다',
    script: `#!/bin/zsh
# @msm-name: Finder 현재 폴더를 터미널로 열기
# @msm-icon: 💻
# @msm-category: Finder
folder=$(osascript -e 'tell application "Finder" to POSIX path of (target of front window as alias)' 2>/dev/null)
if [ -z "$folder" ]; then
  echo "열려 있는 Finder 창이 없습니다" >&2
  exit 1
fi
open -a Terminal "$folder"
`,
  },

  // ── 클립보드 ────────────────────────────────────────────────────────
  {
    id: 'clipboard-uppercase',
    name: '클립보드 텍스트 대문자로',
    icon: '🔠',
    category: '클립보드',
    summary: '클립보드의 텍스트를 대문자로 바꿉니다',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 대문자로
# @msm-icon: 🔠
# @msm-category: 클립보드
pbpaste | tr '[:lower:]' '[:upper:]' | pbcopy
echo "변환 완료"
`,
  },
  {
    id: 'clipboard-lowercase',
    name: '클립보드 텍스트 소문자로',
    icon: '🔡',
    category: '클립보드',
    summary: '클립보드의 텍스트를 소문자로 바꿉니다',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 소문자로
# @msm-icon: 🔡
# @msm-category: 클립보드
pbpaste | tr '[:upper:]' '[:lower:]' | pbcopy
echo "변환 완료"
`,
  },
  {
    id: 'clipboard-json-pretty',
    name: '클립보드 JSON 예쁘게 정리',
    icon: '🧾',
    category: '클립보드',
    summary: '클립보드의 JSON을 들여쓰기해서 다시 넣습니다',
    script: `#!/bin/zsh
# @msm-name: 클립보드 JSON 예쁘게 정리
# @msm-icon: 🧾
# @msm-category: 클립보드
# @msm-description: python3이 필요합니다 (Xcode Command Line Tools에 포함)
set -o pipefail
if pretty=$(pbpaste | python3 -m json.tool); then
  echo -n "$pretty" | pbcopy
  echo "정리 완료"
else
  echo "유효한 JSON이 아닙니다" >&2
  exit 1
fi
`,
  },
  {
    id: 'clipboard-single-line',
    name: '클립보드 텍스트 한 줄로 합치기',
    icon: '➡️',
    category: '클립보드',
    summary: '줄바꿈과 중복 공백을 정리해서 한 줄로 만듭니다',
    script: `#!/bin/zsh
# @msm-name: 클립보드 텍스트 한 줄로 합치기
# @msm-icon: ➡️
# @msm-category: 클립보드
pbpaste | tr '\\n' ' ' | tr -s ' ' | sed 's/^ *//;s/ *$//' | pbcopy
echo "합치기 완료"
`,
  },
  {
    id: 'clipboard-markdown-link',
    name: 'URL로 마크다운 링크 만들기',
    icon: '🔗',
    category: '클립보드',
    summary: '클립보드의 URL과 입력한 제목으로 [제목](URL)을 만듭니다',
    script: `#!/bin/zsh
# @msm-name: 클립보드 URL로 마크다운 링크 만들기
# @msm-icon: 🔗
# @msm-category: 클립보드
# @msm-description: 클립보드의 URL과 입력한 제목으로 [제목](URL) 형식을 만들어 다시 클립보드에 넣습니다
url=$(pbpaste)
title=$(msm-ask "링크 제목을 입력하세요")
if [ -z "$title" ]; then
  echo "취소됨"
  exit 0
fi
echo -n "[$title]($url)" | pbcopy
echo "[$title]($url)"
`,
  },
  {
    id: 'uuid-generate',
    name: 'UUID 생성해서 클립보드로 복사',
    icon: '🆔',
    category: '클립보드',
    summary: '새 UUID를 만들어 클립보드에 넣습니다',
    script: `#!/bin/zsh
# @msm-name: UUID 생성해서 클립보드로 복사
# @msm-icon: 🆔
# @msm-category: 클립보드
id=$(uuidgen)
echo -n "$id" | pbcopy
echo "$id"
`,
  },

  // ── 개발자 ──────────────────────────────────────────────────────────
  {
    id: 'kill-port',
    name: '포트 점유 프로세스 종료',
    icon: '🔌',
    category: '개발자',
    summary: '입력한 포트를 쓰는 프로세스를 찾아 종료합니다',
    script: `#!/bin/zsh
# @msm-name: 포트 점유 프로세스 종료
# @msm-icon: 🔌
# @msm-category: 개발자
port=$(msm-ask "종료할 포트 번호")
if [ -z "$port" ]; then
  echo "취소됨"
  exit 0
fi
pids=$(lsof -ti:"$port")
if [ -z "$pids" ]; then
  echo "포트 $port 를 쓰는 프로세스가 없습니다"
  exit 0
fi
echo "$pids" | xargs kill -9
echo "포트 $port 프로세스 종료함"
`,
  },
  {
    id: 'clean-node-modules',
    name: 'node_modules 전체 삭제',
    icon: '🧹',
    category: '개발자',
    summary: '지정한 폴더 아래 모든 node_modules를 찾아 지웁니다',
    script: `#!/bin/zsh
# @msm-name: node_modules 전체 삭제
# @msm-icon: 🧹
# @msm-category: 개발자
# @msm-description: 지정한 폴더 아래 모든 node_modules를 찾아 지웁니다. 되돌릴 수 없습니다
target=$(msm-ask "정리할 폴더 경로 (예: ~/Projects)")
target="\${target/#\\~/\$HOME}"
if [ -z "$target" ] || [ ! -d "$target" ]; then
  echo "유효한 폴더가 아닙니다" >&2
  exit 1
fi
msm-confirm "\\"$target\\" 아래 모든 node_modules를 정말 삭제할까요?" || { echo "취소됨"; exit 0; }
count=$(find "$target" -type d -name node_modules -prune -print | wc -l | tr -d ' ')
find "$target" -type d -name node_modules -prune -exec rm -rf {} +
echo "$count 개의 node_modules 삭제함"
`,
  },
  {
    id: 'clean-derived-data',
    name: 'Xcode DerivedData 삭제',
    icon: '🧱',
    category: '개발자',
    summary: 'Xcode 빌드 캐시를 지웁니다',
    script: `#!/bin/zsh
# @msm-name: Xcode DerivedData 삭제
# @msm-icon: 🧱
# @msm-category: 개발자
msm-confirm "Xcode DerivedData를 삭제할까요?" || { echo "취소됨"; exit 0; }
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "DerivedData 삭제 완료"
`,
  },
  {
    id: 'git-clean-merged-branches',
    name: 'Git 병합된 로컬 브랜치 정리',
    icon: '🌿',
    category: '개발자',
    summary: '현재 브랜치에 이미 병합된 로컬 브랜치를 지웁니다',
    script: `#!/bin/zsh
# @msm-name: Git에서 병합된 로컬 브랜치 정리
# @msm-icon: 🌿
# @msm-category: 개발자
repo=$(msm-ask "git 저장소 경로 (예: ~/Projects/myapp)")
repo="\${repo/#\\~/\$HOME}"
if [ ! -d "$repo/.git" ]; then
  echo "git 저장소가 아닙니다: $repo" >&2
  exit 1
fi
cd "$repo" || exit 1
base=$(git symbolic-ref --short HEAD)
branches=$(git branch --merged "$base" | grep -v '^\\*' | sed 's/^  *//' | grep -vx "$base")
if [ -z "$branches" ]; then
  echo "정리할 브랜치가 없습니다"
  exit 0
fi
echo "$branches" | xargs -n 1 git branch -d
echo "병합된 브랜치 정리 완료"
`,
  },
  {
    id: 'ip-address',
    name: 'IP 주소 확인',
    icon: '🌐',
    category: '개발자',
    summary: '로컬/공인 IP 주소를 확인해서 클립보드에 복사합니다',
    script: `#!/bin/zsh
# @msm-name: IP 주소 확인
# @msm-icon: 🌐
# @msm-category: 개발자
local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
public_ip=$(curl -s https://api.ipify.org)
result="로컬: $local_ip / 공인: $public_ip"
echo -n "$result" | pbcopy
echo "$result"
`,
  },

  // ── 오디오 ──────────────────────────────────────────────────────────
  {
    id: 'now-playing',
    name: '재생 중인 곡 정보 복사',
    icon: '🎵',
    category: '오디오',
    summary: 'Music.app에서 재생 중인 곡 제목/아티스트를 복사합니다',
    script: `#!/bin/zsh
# @msm-name: 재생 중인 곡 정보 복사
# @msm-icon: 🎵
# @msm-category: 오디오
info=$(osascript -e 'tell application "Music"
  if it is running and player state is playing then
    return (name of current track) & " - " & (artist of current track)
  else
    return ""
  end if
end tell' 2>/dev/null)
if [ -z "$info" ]; then
  echo "재생 중인 곡이 없습니다"
  exit 0
fi
echo -n "$info" | pbcopy
echo "$info"
`,
  },

  // ── 생산성 ──────────────────────────────────────────────────────────
  {
    id: 'launch-work-apps',
    name: '업무 시작 앱 세트 열기',
    icon: '🚀',
    category: '생산성',
    summary: '자주 쓰는 앱을 한 번에 엽니다 (앱 이름은 원하는 대로 수정)',
    script: `#!/bin/zsh
# @msm-name: 업무 시작 앱 세트 열기
# @msm-icon: 🚀
# @msm-category: 생산성
# @msm-description: 자주 쓰는 앱을 한 번에 엽니다 — 앱 이름을 원하는 대로 바꿔서 쓰세요
open -a "Slack" 2>/dev/null
open -a "Mail" 2>/dev/null
open -a "Calendar" 2>/dev/null
echo "업무 앱 실행함"
`,
  },
  {
    id: 'quick-reminder',
    name: '미리알림 빠르게 추가',
    icon: '📝',
    category: '생산성',
    summary: '입력한 내용을 미리알림 앱에 추가합니다',
    script: `#!/bin/zsh
# @msm-name: 미리알림 빠르게 추가
# @msm-icon: 📝
# @msm-category: 생산성
title=$(msm-ask "미리알림 내용")
if [ -z "$title" ]; then
  echo "취소됨"
  exit 0
fi
osascript - "$title" <<'APPLESCRIPT'
on run argv
  set t to item 1 of argv
  tell application "Reminders" to make new reminder with properties {name:t}
end run
APPLESCRIPT
echo "추가함: $title"
`,
  },
];
