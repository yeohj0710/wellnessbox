# B2B Report Payload Map

## 목적

- `lib/b2b/report-payload.ts`의 책임을 빠르게 파악하게 한다.
- 후속 세션에서 “어디를 열어야 하는지” 바로 찾을 수 있게 한다.

## 현재 경계

- 진입점 / 최종 payload 조립
  - `lib/b2b/report-payload.ts`
- 설문 질문 lookup / 응답 정규화 / survey fallback / wellness fallback
  - `lib/b2b/report-payload-survey.ts`
- 분석 payload 파싱
  - `lib/b2b/report-payload-analysis.ts`
- 분석 payload row 정규화 helper
  - `lib/b2b/report-payload-analysis-helpers.ts`
- 건강 지표 / fetch 상태 파싱
  - `lib/b2b/report-payload-health.ts`
- normalized medication / medical 컨테이너 파싱
  - `lib/b2b/report-payload-health-medication.ts`
- medication row helper / 상수
  - `lib/b2b/report-payload-health-medication-helpers.ts`
- 복약 행 조립
  - `lib/b2b/report-payload-medication.ts`
- 복약 raw envelope / visit merge helper
  - `lib/b2b/report-payload-medication-helpers.ts`
- top issue / medication status 판단
  - `lib/b2b/report-payload-issues.ts`
- wellness 출력 구조 정규화
  - `lib/b2b/report-payload-wellness.ts`
- payload 타입 SSOT
  - `lib/b2b/report-payload-types.ts`

## 수정 가이드

1. DB 조회 조건이나 최종 필드 배치를 바꾸면
   - `lib/b2b/report-payload.ts`
2. 설문 문항 문구, 응답 라벨, fallback 설문 선택을 바꾸면
   - `lib/b2b/report-payload-survey.ts`
3. 분석 payload JSON 파싱 규칙을 바꾸면
   - `lib/b2b/report-payload-analysis.ts`
4. 분석 payload 내부 row 정규화 규칙을 바꾸면
   - `lib/b2b/report-payload-analysis-helpers.ts`
5. normalized medication / medical 컨테이너 파싱 규칙을 바꾸면
   - `lib/b2b/report-payload-health-medication.ts`
   - `lib/b2b/report-payload-health-medication-helpers.ts`
6. 건강/복약 원천 데이터 해석을 바꾸면
   - `lib/b2b/report-payload-health.ts`
   - `lib/b2b/report-payload-medication.ts`
7. 복약 raw envelope / visit merge 규칙을 바꾸면
   - `lib/b2b/report-payload-medication-helpers.ts`
8. 최종 타입 계약을 바꾸면
   - `lib/b2b/report-payload-types.ts`

## 빠른 검증

- `npm run qa:b2b:report-payload-survey-helpers`
- `npm run qa:b2b:report-payload-analysis-helpers`
- `npm run qa:b2b:report-payload-health-medication-helpers`
- `npm run qa:b2b:report-payload-medication-helpers`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
