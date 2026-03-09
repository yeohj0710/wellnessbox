# AI Chain Product Brief Modules

`lib/ai/chain.ts`에서 제품 브리프 책임을 분리한 뒤의 진입점 메모입니다.

## 목적

- 채팅 스트리밍 오케스트레이션과 상품 카탈로그 브리프 계산을 분리한다.
- 다음 세션에서 chat core 수정과 product-brief 수정 지점을 바로 구분하게 한다.

## 현재 경계

- `lib/ai/chain.ts`
  - known-context / product-brief / RAG timeout 오케스트레이션
  - LangChain prompt 조립과 stream 반환
- `lib/ai/chain-product-brief.ts`
  - 카테고리 alias / 가격 브리프 계산
  - 상품 요약 기반 fallback 브리프 계산
  - product brief cache TTL / stale-while-revalidate 흐름

## 수정 가이드

- 제품 브리프 문구 형식, 카테고리 alias, 가격 환산 규칙 변경:
  - `lib/ai/chain-product-brief.ts`
- stream orchestration, prompt 연결, timeout wiring 변경:
  - `lib/ai/chain.ts`

## 검증

- `npm run qa:chat:chain-product-brief`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
