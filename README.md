# Shortcut Manager

쉘 스크립트로 작성하는 macOS 단축어 관리자. Electron + React + TypeScript.

원칙은 [PRINCIPLES.md](PRINCIPLES.md), 앞으로의 방향은 [ROADMAP.md](ROADMAP.md), 작업 규칙은 [CLAUDE.md](CLAUDE.md) 참고.

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

- 팔레트 열기 — 기본 `⌥Space` (설정에서 변경 가능)
- 매니저 창 — 단축어 생성/편집/삭제, 단축키 등록, 카테고리, 실행 로그
- 트레이 아이콘(`>_`) — 매니저/팔레트 열기, 폴더 열기, 설정, 업데이트 확인

## 빌드 · 배포

```bash
npm run build      # 타입체크 + 렌더러/일렉트론 번들
npm run dist        # 서명·공증된 .dmg/.zip 로컬 빌드 (release/, 퍼블리시 안 함)
npm run release     # dist와 동일 + GitHub Releases에 업로드
```

서명·공증(Developer ID + notarytool)과 GitHub Releases 배포·자동 업데이트(electron-updater)가 모두 연결되어 있습니다. 자세한 절차는 [CLAUDE.md](CLAUDE.md#required-commands) 참고.

## 상태

M0~M3 완료: 폴더 워처, 전역 단축키(설정 가능), 실행 엔진, CodeMirror 에디터, 카테고리, 트레이, 싱글 인스턴스 락, 서명·공증 DMG, GitHub Releases 자동 업데이트.

다음 방향은 [ROADMAP.md](ROADMAP.md) — 자동 트리거(시간/로그인/앱실행/Wi-Fi 등), 스크립트용 입력 도우미(`msm-ask` 등), Finder 연동.
