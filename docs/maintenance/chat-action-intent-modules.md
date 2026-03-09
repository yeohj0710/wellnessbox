# Chat Action Intent Modules

`lib/chat/action-intent-rules.ts`를 정규식 계층과 runtime metadata 계층으로 분리한 메모입니다.

## 목적

- 액션 intent 정규식 수정과 runtime feedback 수정 지점을 분리합니다.
- `fallback`, `shared`, interactive action 계층이 안정적인 facade import를 유지하게 합니다.
- 다음 세션에서 "의도 판정 규칙"과 "feedback/capability metadata"를 다른 파일에서 바로 찾게 합니다.

## 현재 경계

- `lib/chat/action-intent-rules.ts`
  - public facade
  - pattern/runtime 계층 재수출
- `lib/chat/action-intent-patterns.ts`
  - cart, assessment, navigation, support intent 정규식
  - recommendation section detection 정규식
- `lib/chat/action-intent-runtime.ts`
  - `NAVIGATION_ACTIONS`
  - `CART_ACTIONS`
  - `FALLBACK_ACTION_FEEDBACK`
  - `RuntimeContextFlags`
  - `buildRuntimeContextFlags`

## 수정 가이드

- 문장/입력 의도 정규식 변경
  - `lib/chat/action-intent-patterns.ts`
- fallback 안내 문구, action set, route-context 판정 변경
  - `lib/chat/action-intent-runtime.ts`
- 기존 import 경로를 유지해야 할 때
  - `lib/chat/action-intent-rules.ts`

## 검증

- `npm run qa:chat:action-intent-modules`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
