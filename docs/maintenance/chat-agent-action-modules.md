# Chat Agent Action Modules

`lib/chat/agent-actions.ts`를 후속 작업 진입점이 분명한 facade 구조로 정리한 메모입니다.

## 목적

- 채팅 액션 계약, 액션 카탈로그, 라벨 맵을 서로 다른 파일에서 수정할 수 있게 분리합니다.
- 깨진 한국어 액션 카피와 에이전트 가이드 예시 문구를 정상 UTF-8/LF 상태로 복구합니다.
- 다음 세션에서 "타입 수정", "액션 카탈로그 수정", "가이드 예시 수정"을 서로 다른 파일에서 바로 찾게 합니다.

## 현재 경계

- `lib/chat/agent-actions.ts`
  - public facade
  - contracts/catalog re-export
- `lib/chat/agent-action-contracts.ts`
  - `CHAT_ACTION_TYPES`
  - `ChatActionType`
  - category/capability 계약
  - execute decision / suggested action 계약
- `lib/chat/agent-action-catalog.ts`
  - `CHAT_CAPABILITY_ACTIONS`
  - `CHAT_ACTION_LABELS`
  - 액션 label/prompt/description SSOT
- `app/chat/hooks/useChat.agentGuide.ts`
  - 추천 문맥에서 보여주는 가이드 예시 문구

## 수정 가이드

- 새 액션 타입 추가, 액션 관련 타입 계약 변경
  - `lib/chat/agent-action-contracts.ts`
- 액션 이름, 프롬프트, 설명 변경
  - `lib/chat/agent-action-catalog.ts`
- 채팅 가이드 카드 예시 문구 변경
  - `app/chat/hooks/useChat.agentGuide.ts`
- 기존 import 경로 유지가 필요할 때
  - `lib/chat/agent-actions.ts`

## 검증

- `npm run qa:chat:agent-action-modules`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
