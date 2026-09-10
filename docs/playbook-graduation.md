# 이 앱과 Playbook의 관계

이 문서는 2026-09-10 대화에서 정리된 내용이다. **이 저장소에는 아직 아무 코드도 반영되지 않았다** —
아래 "이 프로젝트에서 해야 할 일"은 실행 전 TODO 목록이다.

## 역할 구분

- **이 앱(mac-shortcut-manager)** — 자유롭게 단축어를 만들고, 고치고, 써보는 실험 공간. `~/Documents/ShortcutScripts`의
  `.sh` 파일이 곧 상태([PRINCIPLES.md](../PRINCIPLES.md) 2번)이고, 사용자가 직접 편집한다.
- **[Playbook](../../mac-hackingMAC)** — 이 앱과 같은 엔진(전역 단축키 등록 + 스크립트 실행)을 쓰지만,
  사용자 경험은 정반대다. "완성된 서비스만 앱스토어처럼 켜고 끄는" 잠금형 제품이고, 편집 UI가 없다.
  배경은 [../../mac-hackingMAC/LOCKED-DOWN-APP-PROPOSAL.md](../../mac-hackingMAC/LOCKED-DOWN-APP-PROPOSAL.md).

이 앱에서 자유롭게 만들어보다가 "이건 완성도가 있다" 싶은 단축어(들)가 나오면, Playbook에 서비스로
등록할 수 있게 하고 싶다는 게 이 문서의 출발점이다.

## 왜 실시간 연동이 아닌가

Playbook이 이 앱의 `~/Documents/ShortcutScripts` 폴더를 실시간으로 감시해서 서비스를 자동 생성하는
구조는 만들지 않는다.

1. 이 앱은 "폴더가 곧 상태"(자유 편집), Playbook은 "번들 리소스는 런타임에 바뀌지 않는다"(잠금) —
   설계 철학이 정반대라 실시간으로 묶으면 둘 중 하나는 거짓말이 된다.
2. 승격의 핵심 작업은 파일 복사가 아니라 **Playbook 쪽에서 서비스 설명 카피(차별점·강점·사용법)를
   새로 쓰는 일**이다. 이건 사람의 판단이 필요해서 자동화해도 그대로 남는다.
3. 실시간 연동은 두 프로젝트를 다시 묶어버려서, 애초에 별도 레포로 분리한 이유([LOCKED-DOWN-APP-PROPOSAL.md](../../mac-hackingMAC/LOCKED-DOWN-APP-PROPOSAL.md)의
   "프로젝트 분리 방안")를 무의미하게 만든다.

그래서 승격은 **Playbook 쪽에서 실행하는, 명시적으로 한 번 실행하는 절차**다(`/promote-to-playbook`
스킬, `mac-hackingMAC/.claude/skills/promote-to-playbook/SKILL.md`). 이 앱은 그 절차의 "원본 재료"를
제공하는 쪽일 뿐, 코드가 이 앱 쪽에서 뭔가를 자동으로 하지는 않는다.

## 이 프로젝트에서 해야 할 일 (TODO — 아직 미구현)

승격 자체는 Playbook 쪽 스킬이 수동으로 처리할 수 있으므로 아래 항목이 없어도 당장 동작한다. 다만 있으면
"이건 Playbook 후보다"를 이 앱 안에서 표시해두고 나중에 찾기 쉬워진다.

1. **`@msm-candidate` 디렉티브 파싱 추가** — `electron/parser.ts`의 `DIRECTIVE_RE`에 `candidate`를
   추가하고, `shared/types.ts`의 `ShortcutMeta`에 `candidate: string | null` 필드를 추가한다. 스크립트
   상단에 `# @msm-candidate: playbook` 한 줄을 적어두는 순수 관례 — 지금은 이 주석을 적어놔도 이 앱이
   읽지 않는다.
2. **Manager UI에 후보 표시(선택)** — `src/manager/Manager.tsx`의 리스트에서 `candidate`가 있는 스크립트에
   작은 뱃지("Playbook 후보")를 보여준다. 없어도 승격 절차는 동작하므로 우선순위 낮음.
3. **이 문서를 [CLAUDE.md](../CLAUDE.md)에서 링크** — 이미 이번 변경에 포함했다(아래 참고).
4. 그 이상의 결합(예: 이 앱에 "Playbook으로 보내기" 버튼)은 만들지 않는다 — 위 "왜 실시간 연동이 아닌가"
   문단과 충돌한다. 필요성이 아주 명확해지기 전에는 재검토하지 않는다.

위 1, 2번은 이 문서를 쓰는 시점에는 **실행하지 않았다** — 다음에 이 항목을 진행할지는 별도로 결정한다.
