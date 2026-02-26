# B2B Analyzer 모듈 가이드

`analyzeB2bReport` 관련 계산 로직의 책임 분리 구조를 빠르게 파악하기 위한 문서입니다.

## 모듈 구성

- `lib/b2b/analyzer.ts`
  - 오케스트레이션 및 최종 결과 조립
  - 약사 코멘트/외부 분석 요약/트렌드 결합
- `lib/b2b/analyzer-helpers.ts`
  - 공통 유틸(`asRecord`, `toText`, `clampScore`, 날짜/숫자 파서 등)
- `lib/b2b/analyzer-survey.ts`
  - 설문 응답 점수화 및 섹션/전체 점수 산출
  - `resolveSectionTitle`, `computeSurvey`
- `lib/b2b/analyzer-health.ts`
  - 건강검진 지표 해석, 위험 플래그 구성, 복약 이력 분석
  - `buildHealth`, `buildMedication`

## 변경 가이드

- 점수 계산 공통 규칙 수정: `analyzer-helpers.ts`
- 설문 계산 로직 수정: `analyzer-survey.ts`
- 검진/복약 판정 규칙 수정: `analyzer-health.ts`
- 최종 응답 스키마/결합 규칙 수정: `analyzer.ts`

## 최소 검증

- `npm run audit:encoding`
- `npm run lint`
- `npx next build`
