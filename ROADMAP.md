# 로드맵 — Shortcuts.app 벤치마크

macOS 단축어 앱과 비교해 이 서비스가 강해질 수 있는 지점을 정리한다. [PRINCIPLES.md](PRINCIPLES.md)의 "script-only" 원칙을 지키는 것만 채택한다 — 즉 실행 단위는 언제나 스크립트 하나이고, 새 기능은 `# @msm-*` 주석 한두 줄로 설명 가능해야 한다.

## 채택: 프리셋 카탈로그 ✅ (구현 완료)

처음엔 개발자 도구 위주(kill-port, node_modules 삭제, git 브랜치 정리 등)로 채웠다가, "일반 대학생·사용자에겐 너무 전문가용"이라는 피드백을 받고 전면 재설계했다. 지금은 학업(오늘 날짜 메모, 뽀모도로 타이머, 할 일 개수 확인), 파일(다운로드/바탕화면 정리, 저장 공간 확인, 캐시 정리), 화면(캡처, 다크모드, 화면 잠금), 소리, 인터넷(Wi-Fi 재연결/비밀번호 확인), 클립보드, 정보(배터리) 7개 카테고리에 32개 프리셋이 `shared/presets.ts`에 있다. 전부 `zsh -n` 문법 검사를 통과했고, 안전한 것들(할 일 개수, 저장 공간, IP 확인, 클립보드 변환, 방금 받은 파일 찾기, 볼륨 설정, 메모 만들기 등)은 실제로 실행해서 출력까지 확인했다. 파괴적이거나 시스템 UI를 재시작하는 것들(파일 정리, 휴지통 비우기, Wi-Fi 재연결, 캐시 삭제 등)은 실제 시스템에 영향을 주므로 문법 검사로만 검증.

이 검증 과정에서 실제 버그 두 개를 잡았다: (1) zsh 변수 뒤에 공백 없이 한글이 바로 붙으면(`$count개`) 이 환경 로케일에서 변수명 일부로 오인식돼 조용히 빈 문자열이 되는 문제 — `${count}개`로 고쳐야 한다. (2) Notes/Calendar/Reminders 앱을 AppleScript로 다루려면 최초 1회 macOS 자동화 권한 승인이 필요하고, Calendar의 날짜 범위 `whose` 필터는 실사용하기엔 너무 느려서(20초+) 캘린더 조회 프리셋은 포기하고 미리알림 개수 확인으로 대체했다.

매니저 사이드바 "📦 프리셋에서 만들기": 검색 + 카테고리 필터로 찾아서 미리보기 후 "이 프리셋으로 만들기" 한 번이면 바로 단축어가 생긴다. AI 도우미와 동일하게 `createShortcut` + `saveShortcut`을 재사용 — 새 백엔드 경로 없음.

## 채택: 자동 트리거 ✅ (`schedule`/`login`/`wake`/`folder` 구현 완료)

지금은 "수동 실행"(단축키 누르기, 팔레트에서 클릭)만 있고, Shortcuts의 "개인 자동화"에 해당하는 "조건이 되면 알아서 실행"이 없다. 이게 가장 큰 격차이자, script-only 원칙과 정확히 맞아떨어지는 확장이다 — 트리거는 "언제"만 정의하고 "무엇"은 여전히 스크립트 하나다.

`electron/triggers.ts`의 `TriggerEngine`이 담당. `schedule`/`login`/`wake`/`folder` 네 가지는 실제로 동작 확인됨(폴더에 파일 추가 → 스크립트가 그 경로를 `$1`로 받아 실행, 재시작 시 `login` 트리거 실행, 지정 시각에 `schedule` 실행). `app-launch`/`wifi-connect`/`battery-below`/`power-connected`는 아직 미구현.

`@msm-hotkey`와 동일한 패턴으로 `@msm-trigger` 주석을 추가(한 스크립트에 여러 줄 가능):

```bash
# @msm-trigger: schedule 09:00        # 매일 09:00
# @msm-trigger: login                  # 로그인 시
# @msm-trigger: wake                   # 잠에서 깰 때
# @msm-trigger: app-launch com.apple.Safari
# @msm-trigger: wifi-connect "Home WiFi"
# @msm-trigger: battery-below 20
# @msm-trigger: power-connected
# @msm-trigger: folder ~/Downloads     # 폴더에 파일 생기면 그 경로를 $1로 실행
```

구현 난이도 순(쉬운 것부터): `schedule`(자체 타이머) → `login`/`wake`(Electron `powerMonitor`) → `folder`(이미 있는 chokidar 인프라 재사용) → `app-launch`/`app-quit`(`NSWorkspace` 알림, 네이티브 연동 필요) → `wifi-connect`(폴링 기반, 배터리 비용 고려) → `battery-below`/`power-connected`(`powerMonitor` + `pmset` 폴링).

## 채택: 단축키 충돌 안내 ✅ (구현 완료)

단축키는 스크립트 개수만큼 늘어나는데, Electron의 `globalShortcut.register()`는 같은 앱 안에서 두 번째 등록이 첫 번째를 조용히 덮어써버린다 — 실패도, 에러도 없다. 그래서 스크립트 A와 B에 같은 단축키를 넣어도 지금까지는 아무 알림 없이 하나가 무력화됐다. [PRINCIPLES.md](PRINCIPLES.md) 6번("조용히 실패하지 않는다")을 정면으로 어기는 사각지대였다.

`electron/hotkeys.ts`에 `HotkeyRegistrar`를 두어 모든 단축키 등록(스크립트 + 팔레트)이 이 한 곳을 거치게 했다. 이름 순으로 정렬해 먼저 오는 쪽이 항상 이기도록 결정적으로 처리하고, 충돌하면 진 쪽에 "이미 "OO"에서 쓰고 있는 단축키예요"처럼 상대 이름을 콕 집어 알려준다(기존 `HotkeyRecorder` 에러 표시 UI 재사용, 새 UI 없음). OS 레벨 충돌(다른 앱이 먼저 선점 — 예: mind-map의 `Alt+Space` 퀵캡처, 환경 노트 참고)은 어떤 앱이 이겼는지 알 방법이 없어 일반 문구로 안내한다.

## 채택: 스크립트용 입력 도우미 ✅ (구현 완료)

Shortcuts의 "입력받기" 액션에 대응. 앱에 새 UI를 만드는 대신, 스크립트가 호출할 수 있는 작은 CLI 3개를 앱과 함께 제공한다(AppleScript `display dialog`/`choose from list` 백엔드, 또는 우리 앱이 직접 처리):

```bash
name=$(msm-ask "이름을 입력하세요")
color=$(msm-choose "색상 선택" "빨강" "파랑" "초록")
msm-confirm "정말 삭제할까요?" && rm "$file"
```

여전히 스크립트 하나 + 셸 명령 호출일 뿐이라 원칙 위반이 아니다.

## 채택: AI 작성 도우미 ✅ (구현 완료)

Shortcuts.app에는 없는, 이 앱만의 확장 — 쉘 스크립트를 모르는 사용자를 위한 진입로. API 키·과금·네트워크 의존성 없이, 앱은 "붙여넣기 좋은 프롬프트"를 조립해줄 뿐이고 실제 코드 생성은 사용자가 이미 쓰는 ChatGPT/Claude에서 일어난다. AI가 준 결과를 그대로 붙여넣으면 스크립트 파일이 되므로 여전히 "스크립트 하나"가 유일한 실행 단위 — 원칙 위반이 아니다.

매니저 사이드바 "🤖 AI로 만들기": (1) 원하는 동작을 설명 → 이 앱의 스크립트 포맷·트리거 문법·입력 도우미를 포함한 프롬프트를 클립보드에 복사 (+ChatGPT/Claude 바로 열기) → (2) 답변으로 받은 코드를 붙여넣고 만들기.

## 채택 검토(중기): Finder 연동

파일을 선택하고 우클릭 → 스크립트 실행 (Shortcuts의 "빠른 동작"에 대응). macOS Services(`NSServices`) 등록이 필요해 Info.plist 후처리 등 별도 네이티브 작업이 들어간다. 선택된 파일 경로가 스크립트의 인자로 들어가는 것뿐이므로 원칙에는 부합하지만, 엔지니어링 비용이 커서 트리거·입력 도우미 이후로 미룬다.

## 채택하지 않음

- **Siri 음성 실행, 아이폰/애플워치 동기화** — 애플 생태계 동기화가 필요해 로컬 맥 앱으로는 근본적으로 닿을 수 없다.
- **시각적 액션 그래프/분기 편집기** — [PRINCIPLES.md](PRINCIPLES.md) 1번 위반. 조건문·반복문이 필요하면 스크립트 안에서 작성한다.
- **다른 앱 공유 시트에 등장(Share Extension)** — 별도 확장 번들·서명이 필요해 지금 규모에 비해 비용이 과하다. 필요해지면 재검토.

## 진행 순서 제안

1. ~~`schedule` / `login` / `wake` 트리거~~ ✅
2. ~~`folder` 트리거~~ ✅
3. ~~입력 도우미 3종 (`msm-ask`/`msm-choose`/`msm-confirm`)~~ ✅
4. `app-launch`/`wifi-connect`/`battery-below` 등 나머지 트리거
5. Finder Quick Action (중기)
