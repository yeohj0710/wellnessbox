# B2B Report Payload Map

## 목적
- `lib/b2b/report-payload.ts`의 단일 파일 복잡도를 낮추고, 후속 세션에서 수정 포인트를 빠르게 찾게 합니다.
- DB 조회 오케스트레이션과 분석 payload 파싱 로직을 분리해 회귀 범위를 줄입니다.

## 경계
- 오케스트레이션(조회/조립):
  - `lib/b2b/report-payload.ts`
- 분석 payload 파싱:
  - `lib/b2b/report-payload-analysis.ts`
- 최종 payload 타입 계약:
  - `lib/b2b/report-payload-types.ts`
- 점수 엔진:
  - `lib/b2b/report-score-engine.ts`
  - `lib/b2b/report-score-profile.ts`

## 수정 가이드
1. DB 조회 조건(최신/폴백/period 기준)을 바꾸면:
   - `lib/b2b/report-payload.ts`를 수정합니다.
2. 분석 payload(JSON) 파싱 규칙을 바꾸면:
   - `lib/b2b/report-payload-analysis.ts`를 수정합니다.
3. 최종 payload 구조 변경이 있으면:
   - `lib/b2b/report-payload-types.ts`를 먼저 수정한 뒤 컴파일 에러를 따라 반영합니다.
4. 점수 계산 정책 변경은:
   - `lib/b2b/report-score-profile.ts` -> `lib/b2b/report-score-engine.ts` 순서로 수정합니다.

## 빠른 검증
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
- `npm run qa:b2b:score-engine`
