import { useState } from 'react';

interface Props {
  onCreate: (name: string, content: string) => void;
  onCancel: () => void;
}

function buildPrompt(description: string): string {
  return `당신은 macOS zsh 쉘 스크립트를 작성하는 어시스턴트입니다. 아래 형식과 요청에 맞는 스크립트를 작성해주세요.

## 파일 형식
- 첫 줄은 \`#!/bin/zsh\`
- 그 다음 헤더 주석으로 메타데이터를 적습니다 (전부 선택사항, 필요한 것만 넣으세요):
  # @msm-name: 표시될 이름
  # @msm-icon: 이모지 하나
  # @msm-description: 한 줄 설명
  # @msm-category: 카테고리명
  # @msm-hotkey: Cmd+Shift+D   (전역 단축키. 필요 없으면 생략)
  # @msm-trigger: schedule 09:00   (매일 그 시각 자동 실행, 필요하면)
  # @msm-trigger: login             (앱 시작 시 자동 실행)
  # @msm-trigger: wake              (잠에서 깰 때 자동 실행)
  # @msm-trigger: folder ~/Downloads   (그 폴더에 파일이 생기면 경로가 $1로 전달됨)
  (트리거는 여러 줄 가능하고, 필요 없으면 전부 생략)
- 그 아래부터 실제 스크립트 본문

## 사용 가능한 도우미 명령 (필요할 때만 사용)
- msm-ask "질문"            텍스트 입력 다이얼로그. 답을 stdout으로 출력
- msm-choose "제목" 옵션1 옵션2 ...   목록 선택 다이얼로그. 선택값을 stdout으로 출력
- msm-confirm "질문"         예/아니오 다이얼로그. "예"면 종료 코드 0

## 상태 표시 (중요)
이 앱은 스크립트가 끝나면 항상 시스템 알림 팝업을 띄웁니다 — 성공(종료 코드 0)하면 stdout의 마지막 부분을, 실패하면 stderr를 알림 내용으로 보여줍니다. 그러니 스크립트 마지막에 무엇을 했는지 짧게 한국어로 echo 하세요 (예: echo "완료: 다운로드 폴더 정리함"). 실패 상황에서는 원인을 stderr로 echo하고 exit 1 하세요.

## 출력 규칙
다른 설명 없이, 완성된 스크립트 하나만 코드 블록으로 출력하세요. 바로 복사해서 실행할 수 있어야 합니다.

## 요청
${description.trim()}`;
}

// The AI itself never runs inside the app — this only builds a prompt to
// paste into ChatGPT/Claude and takes the pasted-back script as-is. No API
// key, no network call, no new execution model: still exactly one .sh file.
export default function AiAssistDialog({ onCreate, onCancel }: Props) {
  const [description, setDescription] = useState('');
  const [pastedCode, setPastedCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildPrompt(description));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function submit() {
    const name = description.trim().slice(0, 40) || 'AI 단축어';
    onCreate(name, pastedCode);
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog ai-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>AI로 단축어 만들기</h2>

        <div className="ai-step">
          <span className="ai-step-label">1. 원하는 동작을 설명하세요</span>
          <textarea
            className="dialog-textarea"
            placeholder="예: 다운로드 폴더에 새 파일 생기면 스크린샷 폴더로 정리해줘"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="ai-step-actions">
            <button onClick={() => void copyPrompt()} disabled={!description.trim()}>
              {copied ? '복사됨 ✓' : '프롬프트 복사'}
            </button>
            <button onClick={() => window.msm.openExternal('https://chatgpt.com/')}>ChatGPT 열기</button>
            <button onClick={() => window.msm.openExternal('https://claude.ai/new')}>Claude 열기</button>
          </div>
        </div>

        <div className="ai-step">
          <span className="ai-step-label">2. AI가 준 코드를 붙여넣으세요</span>
          <textarea
            className="dialog-textarea ai-code-area"
            placeholder="#!/bin/zsh ..."
            spellCheck={false}
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
          />
        </div>

        <div className="dialog-actions">
          <button onClick={onCancel}>취소</button>
          <button className="primary" onClick={submit} disabled={!pastedCode.trim()}>
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
