# AI Chain Known Context Modules

`lib/ai/chain.ts`에서 known-context 책임을 분리한 뒤의 진입점 메모입니다.

## 목적

- 채팅 스트리밍 오케스트레이션과 known-context 데이터 조립을 분리한다.
- 다음 세션에서 결과 범위 문구, 최신 결과 라벨링, client hydration 보정 지점을 바로 찾게 한다.

## 현재 경계

- `lib/ai/chain.ts`
  - known-context / product-brief / RAG timeout 오케스트레이션
  - prompt 조립과 stream 반환
- `lib/ai/chain-known-context.ts`
  - category alias 해석
  - 최신 결과 기반 known-context 문자열 조립
  - client hydration 보정과 결과 범위 문구 처리

## 수정 가이드

- 결과 범위 문구, 평가/빠른검사 요약 라벨, latest result 조립 변경:
  - `lib/ai/chain-known-context.ts`
- stream orchestration, prompt 연결, timeout wiring 변경:
  - `lib/ai/chain.ts`

## 검증

- `npm run qa:chat:chain-known-context`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
