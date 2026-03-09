# Chat Fallback Modules

`lib/chat/actions/fallback.ts`를 fallback 규칙 helper와 orchestration 셸로 분리한 메모입니다.

## 목적

- fallback 액션 판정, 안내 문구 조립, suggested action 선택 규칙을 한 곳에서 관리합니다.
- `fallback.ts`는 입력 정규화와 최종 decision 반환에 집중하게 합니다.
- 다음 세션에서 "어떤 액션이 선택되는지"와 "메시지를 어떻게 조합하는지"를 같은 파일에서 바로 찾게 합니다.

## 현재 경계

- `lib/chat/actions/fallback.ts`
  - public entry
  - execute/suggest body 정규화
  - runtime context 파생 후 helper 호출
- `lib/chat/actions/fallback-support.ts`
  - execute fallback action draft 계산
  - fallback assistant reply 조립
  - fallback reason 토큰 조립
  - suggested action 목록 선택

## 수정 가이드

- fallback 액션 우선순위, focus/navigation 판정 규칙 변경
  - `lib/chat/actions/fallback-support.ts`
- fallback 응답 카피 변경
  - `lib/chat/actions/fallback-support.ts`
- route/body 정규화나 진입 방식 변경
  - `lib/chat/actions/fallback.ts`

## 검증

- `npm run qa:chat:fallback-modules`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
