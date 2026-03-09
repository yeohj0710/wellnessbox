# Chat Prompt Modules

`lib/chat/prompts.ts`를 후속 작업 친화적인 경계로 정리한 메모입니다.

## 목적

- 깨진 한국어 prompt 문자열을 정상 UTF-8/LF 상태로 복구합니다.
- system prompt 규칙, 공통 텍스트 정규화, suggestion/title prompt를 서로 다른 파일에서 바로 수정할 수 있게 합니다.
- `prompts.ts`는 조립 레이어로 유지해 다음 세션에서 진입점이 명확하게 보이게 합니다.

## 현재 경계

- `lib/chat/prompts.ts`
  - public facade
  - `buildMessages`
  - prompt module re-export
- `lib/chat/prompt-types.ts`
  - prompt role/message/history/input 계약
- `lib/chat/prompt-helpers.ts`
  - 공통 line 정리
  - 길이 제한
  - 대화 history 문자열화
  - context payload 조립
  - chat history normalize
- `lib/chat/prompt-system.ts`
  - init/chat mode 규칙
  - tone/data/rag/output 규칙
  - `buildSystemPrompt`
- `lib/chat/prompt-followups.ts`
  - suggestion topic classifier prompt
  - suggestion generation prompt
  - title generation prompt

## 수정 가이드

- system prompt 규칙, 말투, RAG/data fallback 변경:
  - `lib/chat/prompt-system.ts`
- 길이 제한, history normalize, context payload shape 변경:
  - `lib/chat/prompt-helpers.ts`
- suggestion/title prompt 변경:
  - `lib/chat/prompt-followups.ts`
- `/api/chat`, `/api/chat/suggest`, `/api/chat/title` 공통 entry 변경:
  - `lib/chat/prompts.ts`

## 검증

- `npm run qa:chat:prompt-modules`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
