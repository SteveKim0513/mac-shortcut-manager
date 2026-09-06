# Shortcut Manager

쉘 스크립트로 작성하는 macOS 단축어 관리자. Electron + React + TypeScript.

## 핵심 개념

`.sh` 파일 자체가 단축어입니다. 별도 DB 없이 헤더 주석으로 이름·단축키·아이콘을 정의합니다.

```bash
#!/bin/zsh
# @msm-name: 다크모드 토글
# @msm-hotkey: Cmd+Shift+D
# @msm-icon: 🌓
# @msm-description: macOS 시스템 다크모드를 켜고 끕니다
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'
```

스크립트 폴더(`~/Documents/ShortcutScripts`)를 감시하다가 파일이 추가/수정/삭제되면 팔레트 목록과 전역 단축키 등록이 자동으로 동기화됩니다.

## 개발

```bash
npm install
npm run dev
```

- `⌥Space` — 검색/실행 팔레트 열기 (닫으려면 `Esc` 또는 포커스 아웃)
- 매니저 창 — 단축어 생성/편집/삭제, 실행 로그 확인

## 빌드

```bash
npm run build    # 타입체크 + 렌더러/일렉트론 번들
npm run dist      # .dmg 생성 (release/) — 서명·공증은 아직 미설정
```

## 상태

M0/M1 스캐폴딩 완료: 폴더 워처, frontmatter 파서, 전역 단축키, 실행 엔진, 최소 팔레트·매니저 UI.

M2 예정: 내장 CodeMirror 에디터, 단축키 레코더 UI, 카테고리/태그, 트레이 아이콘.
M3 예정: 코드 서명·공증·DMG (mind-map 파이프라인 참고), 자동 업데이트.
