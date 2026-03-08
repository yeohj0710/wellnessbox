# B2B 건강 리포트 디자인 시스템 맵

## 목적
- 웹(`/employee-report`, `/admin/b2b-reports`)과 export(PDF/PPTX)가 같은 톤과 정보 구조를 유지하도록 공통 토큰/섹션 구조를 문서화합니다.
- 후속 세션에서 레이아웃/점수 로직/출력 품질 이슈를 빠르게 파악할 수 있게 합니다.

## 핵심 파일
- 디자인 토큰/문구 정규화: `lib/b2b/report-design.ts`
- 웹 요약 카드 진입점: `components/b2b/ReportSummaryCards.tsx`
- 웹 요약 카드 스타일: `components/b2b/ReportSummaryCards.module.css`
- 웹 뷰모델(점수/차트 가공): `components/b2b/report-summary/view-model.ts`
- 웹 헬퍼(점수 포맷/델타/스파크라인): `components/b2b/report-summary/helpers.ts`
- export 레이아웃 DSL: `lib/b2b/export/layout-dsl.ts`
- export 파이프라인/검증: `lib/b2b/export/pipeline.ts`

## 공통 구조(웹/Export)
1. 히어로 요약: 대상자/기간/생성시각 + 종합 위험도
2. KPI 4개: 종합/설문/검진/복약 점수
3. 핵심 이슈 TOP3 + 실천 가이드
4. 영역별 점수 + 월별 추이
5. 검진 지표 + 복약 요약
6. 설문 요약 + 약사/AI 코멘트

## 점수 데이터 없음 처리
- `components/b2b/report-summary/view-model.ts`에서 `resolveScore()` 결과를 사용해 `missing` 사유를 수집합니다.
- 웹은 히어로 경고 리스트와 각 카드 helper에 사유를 노출합니다.
- export는 동일한 점수/사유를 텍스트 카드에 반영합니다.

## Export 안정성 정책
- `runB2bLayoutPipeline()`는 stage(`base -> shorten -> compact -> fallback`)별로 검증합니다.
- `TEXT_OVERFLOW`만 있는 경우는 warning으로 간주해 export를 진행합니다.
- `BOUNDS`, `OVERLAP`, `CLIP`은 blocking issue로 처리하여 실패합니다.

## 운영 QA 커맨드
- 점수 엔진: `npm run qa:b2b:score-engine`
- CDE 통합 회귀(칼럼+리포트 핵심 플로우): `npm run qa:cde:regression:local`
- B2B export 스모크(검증 + PPTX/PDF 상태 확인): `npm run qa:b2b:export-smoke`

## 수정 가이드
- 색/톤 변경: `lib/b2b/report-design.ts`의 `REPORT_STYLE_PRESETS`만 수정
- 웹 섹션 순서/카드 UX 변경: `components/b2b/ReportSummaryCards.tsx`
- export 섹션 순서/레이아웃 변경: `lib/b2b/export/layout-dsl.ts`
- 점수 산식 변경: `lib/b2b/report-score-engine.ts`
