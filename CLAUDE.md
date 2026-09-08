# Claude Code Instructions

## Start Here

- 작업 전 `git status --short` 확인.
- 새 기능을 만들기 전에 [PRINCIPLES.md](PRINCIPLES.md)를 읽는다 — script-only 원칙과 충돌하면 기능을 포기하거나 재설계한다.
- 지금 방향이 궁금하면 [ROADMAP.md](ROADMAP.md) 참고.
- 기존 사용자 변경사항을 덮어쓰거나 되돌리지 않는다.

## 질문과 실행 지시 구분

- 사용자 메시지가 **질문**("~는 뭐야?", "~할까?", "어떻게 생각해?", "왜 이렇게 됐어?" 등 정보·의견 요청)이면 **답변만 하고** 파일 수정·커밋·명령 실행에 들어가지 않는다.
- **실행**(파일 수정, 커밋, `npm`/`git`/`gh` 명령 실행 등)은 사용자가 명확한 시작 지시("진행해", "구현해줘", "만들어줘", "고쳐줘" 등)를 준 뒤에만 시작한다.
- 메시지가 질문과 지시가 섞여 있거나 모호하면 접근 방식을 1~2문장으로 요약해 제안하고 확인받은 뒤 진행한다.

## Required Commands

```bash
npm install
npm run dev          # Electron + Vite 개발 서버
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + 렌더러/일렉트론 번들
npm run dist          # 서명·공증된 .dmg/.zip 로컬 빌드 (release/, 퍼블리시 안 함)
npm run release       # dist와 동일 + GitHub Releases에 실제 업로드
node scripts/make-icon.mjs   # build/icon.icns 재생성 (디자인 바뀔 때만)
```

- 완료 주장 전 최소 `npm run typecheck` (UI·electron 변경 시 `npm run build`까지) 실행.
- UI/Electron 변경은 반드시 `npm run dev`로 실제 창을 띄워 확인한다 — 아래 "환경에서 겪은 것들"의 함정을 먼저 읽을 것.
- 패키지 매니저는 npm만 쓴다.

## Architecture

```
electron/main.ts        ─ 창 생성(매니저/팔레트), 전역 단축키, 트레이, IPC 핸들러
electron/registry.ts    ─ scripts 폴더 워처 → 파싱 → 전역 단축키 재등록 (핵심 동기화 루프)
electron/parser.ts      ─ .sh 헤더 주석(@msm-*) ↔ ShortcutMeta 변환
electron/runner.ts      ─ 스크립트 실행 (/bin/zsh)
electron/settings.ts    ─ 앱 설정(팔레트 단축키 등) userData/settings.json 영속화
electron/updater.ts     ─ electron-updater 래퍼 (mind-map과 동일 패턴)
electron/preload.ts     ─ contextBridge로 window.msm API 노출
shared/types.ts         ─ main ↔ renderer 공유 타입 (ShortcutMeta, RunResult)
src/App.tsx             ─ ?palette=1 쿼리로 팔레트/매니저 렌더링 분기 (창 두 개, 번들 하나)
src/manager/, src/palette/  ─ 각 창의 React 컴포넌트
```

- 스크립트 메타데이터의 진실의 원천은 항상 `.sh` 파일이다. `registry.ts`는 그걸 미러링만 한다 — 별도 캐시/DB를 새로 만들지 않는다.
- `shared/`의 타입은 electron과 src 양쪽에서 import한다(빌드 시 타입만 지워지므로 순환 의존 걱정 없음).

## Approval Boundaries

명시적 승인 없이 하지 않는다:

- `npm run release` (GitHub Releases에 실제 업로드), `gh release edit --draft=false` (공개 전환)
- `git push --force`, `git reset --hard`
- GitHub 저장소 생성/삭제, 계정(gh auth switch) 전환이 필요한 작업
- `GH_TOKEN`을 명령줄에 노출하는 형태의 실행 — auto-mode 분류기가 막는다. 필요하면 `.claude/settings.local.json`에 좁게 스코프된 허용 규칙을 추가하고 진행한다(이미 `npm run release` 관련 규칙이 있음).

## Definition of Done

1. 변경한 파일 목록
2. `npm run typecheck` (+ 필요시 `npm run build`) 결과
3. UI/Electron 변경이면 `npm run dev` 런타임 확인 증거
4. 남아 있는 위험·미검증 항목

## 환경에서 겪은 것들 (다음 세션을 위한 기록)

- **`ELECTRON_RUN_AS_NODE=1`이 이 셸 환경에 기본으로 걸려 있다.** `electron .`을 직접 실행하면 Electron이 아니라 그냥 Node로 켜져서 앱이 안 뜬다. `npm run dev`(vite-plugin-electron이 자동으로 이 변수를 지움)는 문제없다. 패키지 바이너리를 직접 검증할 때는 `env -u ELECTRON_RUN_AS_NODE`로 지우고 실행할 것.
- **Electron 렌더러는 `window.prompt()`를 지원하지 않는다** — 호출하면 다이얼로그 없이 바로 `null`. `alert()`/`confirm()`은 지원된다. 사용자 입력이 필요하면 자체 다이얼로그 컴포넌트를 만든다(`src/manager/NewShortcutDialog.tsx` 참고).
- **mind-map도 `Alt+Space`를 자기 퀵캡처 창에 쓴다.** 두 앱을 동시에 켜면 먼저 뜬 쪽이 전역 단축키를 가져간다. 이제 우리는 `settings.json`에서 palette 단축키를 바꿀 수 있으니 충돌하면 설정에서 바꾸면 된다.
- **AX(System Events) 자동화로 창을 조작할 때, 앱이 frontmost가 아니면 `count of windows`가 0으로 나올 수 있다.** `set frontmost of process "Electron" to true` 후 1초 정도 delay를 주고 다시 질의할 것. 버튼 이름 조회(`name of every button`)는 이 환경에서 자주 `missing value`만 반환해 신뢰할 수 없다 — 좌표나 다른 방법을 쓰거나, HTTP curl로 모듈 로딩만 확인하는 쪽이 더 안정적이다.
- **`display dialog`/`choose from list` 같은 AppleScript 모달을 System Events로 자동 검증할 때, 키 입력을 1개(`key code 36` Return, `key code 53` Escape)만 보내는 건 안정적으로 성공하지만 2개 이상을 순차로 보내면(예: 텍스트 타이핑 후 Return, 화살표 후 Return) 자주 실패한다** — 각 `osascript -e`가 별도 프로세스라 포커스 레이스가 생기는 듯하다. 이런 다이얼로그를 검증할 때는 기본 버튼/취소 경로(단일 키)만 자동으로 확인하고, "타이핑"이 필요한 경로는 코드 리뷰로 대체하는 게 낫다.
- **osascript로 스크립트를 stdin(heredoc)으로 넘기면서 인자도 같이 줄 때는 `osascript - "$1" <<'EOF'`처럼 `-`를 반드시 붙여야 한다.** `-` 없이 `osascript <<'EOF' "$1"`라고 쓰면 `"$1"`을 (stdin 스크립트가 아니라) 열어야 할 스크립트 **파일 경로**로 오인해서 "No such file or directory" 에러가 나고, heredoc 내용은 조용히 무시된다. `electron/helpers.ts`의 msm-ask/msm-choose/msm-confirm에서 실제로 겪은 버그.
- **`shared/presets.ts`에서 zsh 변수 뒤에 공백 없이 한글을 바로 붙이면(`$count개`) 이 환경의 로케일에서 "개"가 변수명의 일부로 오인식돼 조용히 빈 문자열이 된다.** `${count}개`처럼 중괄호로 감싸야 안전하다 — 단 TS 템플릿 리터럴 안에서는 `\${count}개`로 이스케이프해야 JS 보간과 안 겹친다(위 항목과 같은 종류의 함정). `zsh -n` 문법 검사로는 못 잡는다 — 실제로 실행해봐야 드러난다. 프리셋을 새로 쓸 때마다 `grep -rnP '\$[a-zA-Z_][a-zA-Z0-9_]*[가-힣]'`로 스캔해서 걸리는 게 있으면 고칠 것.
- **Notes/Calendar/Reminders 앱을 `osascript`로 다루면 그 앱을 대상으로 한 최초의 Apple Event에서 macOS 자동화 권한 승인 창이 뜨고, 사용자가 직접 클릭할 때까지 그 `osascript` 프로세스가 무기한 블록된다.** System Events가 이미 허용돼 있어도 다른 앱(Notes 등)은 별도로 다시 물어본다. 자동화로 이 창을 감지·클릭할 방법이 없다(AX가 보안상 의도적으로 못 보게 되어 있음) — 터미널에서 검증할 때 백그라운드로 돌리고 `sleep N` 후 `kill -0`으로 살아있으면 죽이는 식으로 타임아웃을 걸어야 한다. **Calendar의 날짜 범위 `whose` 필터(`whose start date ≥ X`)는 실사용 불가능할 정도로 느리다(20초 넘게 걸림, 30초 실행 타임아웃에 위험할 정도로 근접)** — 이 패턴으로 프리셋을 만들지 말 것. Reminders의 `count of (every reminder whose ...)`처럼 개수만 세는 필터는 몇 초 안에 끝나 안전하지만, per-item으로 순회하며 속성을 하나씩 읽는 반복문은 마찬가지로 느리다.
- **`npm run dev`와 설치된 패키지 앱(`/Applications/Shortcut Manager.app`)은 같은 `userData` 경로를 공유한다.** `requestSingleInstanceLock()` 때문에 패키지 앱이 떠 있으면 dev 인스턴스가 조용히 안 켜진다(에러 로그도 없음). dev로 확인하기 전에 패키지 앱을 먼저 종료할 것: `osascript -e 'tell application id "co.imaginefutures.shortcutmanager" to quit'`.
- **gh CLI 계정이 두 개 등록되어 있다**: `SteveKim0513`(public 저장소용, SSH 별칭 `github.com-stevekim`)와 `imaginefutures`(SSH 별칭 `github.com-imaginefutures`). 이 프로젝트는 `SteveKim0513/mac-shortcut-manager`(public)를 쓴다. **활성 계정이 저절로 `imaginefutures`로 돌아가는 일이 반복 관찰됨** (`gh auth switch`로 고쳐놔도 몇 분 안에 원상복귀되기도 함) — `gh auth switch` + "확인 후 진행"으로는 못 막는다. 대신 **활성 계정에 의존하지 않는 방식**을 쓴다:
  - `npm run release`용 토큰: `GH_TOKEN="$(gh auth token --hostname github.com --user SteveKim0513)"` — `--user`를 명시하면 활성 계정이 뭐든 상관없이 그 계정의 토큰을 가져온다.
  - `gh release`류 명령(`edit`, `view` 등, `--user` 옵션 자체가 없음): 앞에 같은 방식으로 `GH_TOKEN=...`을 붙여서 실행 — 예: `GH_TOKEN="$(gh auth token --hostname github.com --user SteveKim0513)" gh release edit vX.Y.Z -R SteveKim0513/mac-shortcut-manager --draft=false`. `GH_TOKEN` 환경변수가 있으면 gh는 활성 계정 대신 그 토큰을 쓴다.
  - 저장소 생성/삭제처럼 `--user`가 없는 `gh repo`/`gh auth refresh` 같은 명령만 어쩔 수 없이 `gh auth switch`가 필요 — 그 경우에도 실행 직전에 `gh api user --jq '.login'`으로 다시 한번 확인할 것.
- **electron-builder는 릴리즈를 기본적으로 Draft로 만든다.** `npm run release` 후 `gh release edit vX.Y.Z -R SteveKim0513/mac-shortcut-manager --draft=false`로 명시적으로 공개해야 실제로 보인다.

- **`globalShortcut.register()`는 같은 프로세스 안에서 두 번째 호출이 첫 번째를 조용히 덮어쓴다.** 실패를 반환하지 않으므로 직접 짠 등록 로직으로는 스크립트 간 단축키 충돌을 절대 감지할 수 없다 — 반드시 `electron/hotkeys.ts`의 `HotkeyRegistrar`처럼 등록을 한 곳에 모아 클레임 결과를 직접 추적해야 한다. 실제 충돌 파일 두 개(`@msm-hotkey: Cmd+Shift+9`)로 재현해 `이미 "OO"에서 쓰고 있는 단축키예요` 메시지가 뜨는 것까지 확인함.

## Personal Overrides

개인·장비별 설정은 `.claude/settings.local.json`에 작성한다(gitignore됨). 지금은 `npm run release` 실행을 위한 Bash 권한 규칙이 들어 있다.
