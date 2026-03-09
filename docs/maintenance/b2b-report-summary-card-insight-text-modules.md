# B2B Report Summary Card Insight Text Modules

`components/b2b/report-summary/card-insights.ts`는 이제 리스크/인사이트 후보 조립에 집중하고, 공통 텍스트 정규화와 설문 답변 디코딩은 별도 helper 모듈로 분리되어 있습니다.

## 파일 역할

- `components/b2b/report-summary/card-insight-text.ts`
  - 설문 답변 코드 -> 라벨 디코딩
  - 제목/문장/조언 톤 정규화
  - 공통 `clampPercent`, `toTrimmedText`, `ensureSentence`, `resolveHealthScoreLabel`
  - 설문 응답 lookup 생성
- `components/b2b/report-summary/card-insights.ts`
  - 분석/리스크 후보 추출
  - 카드용 friendly line / detailed line 조립
  - 지표 상태 라벨과 건강 인사이트 라인 생성

## 수정 가이드

- 답변 라벨 해석, 문장 톤, 제목 정리 규칙 수정:
  - `components/b2b/report-summary/card-insight-text.ts`
- 카드용 분석/리스크 라인 선택 규칙 수정:
  - `components/b2b/report-summary/card-insights.ts`
- 지표 값 포맷, 상태 라벨, 건강 인사이트 문구 수정:
  - `components/b2b/report-summary/card-insights.ts`

## 검증

- `npm run qa:b2b:report-summary-card-insight-text`
- `npm run qa:medication:resilience`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
