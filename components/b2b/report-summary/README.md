# Report Summary 모듈 가이드

`components/b2b/ReportSummaryCards.tsx`와 B2B 리포트 요약 UI에서 사용하는 계산/가공 로직의 책임 분리 문서입니다.

## 파일 역할

- `helpers.ts`
  - 점수/톤/포맷 공통 유틸
  - 여러 리포트 컴포넌트에서 재사용 가능한 순수 함수
- `view-model.ts`
  - 관리자용 요약 리포트의 데이터 가공(view model) 전담
  - 차트/요약 카드에 바로 주입 가능한 구조 생성
- `card-insights.ts`
  - `ReportSummaryCards` 전용 문장 가공/리스크 라인 구성/지표 인사이트 생성
  - 렌더링 로직과 텍스트 가공 로직 분리를 통해 본 컴포넌트 복잡도 완화
- `copy.ts`
  - overview / health / medication 페이지 카피와 빈 상태 문구의 공통 SSOT
  - `ReportSummaryCards.tsx`에서 페이지 조립과 카피 수정 책임을 분리
- `page-contracts.ts`
  - `ReportSummaryPages.tsx`가 받는 prop/text 계약과 row 타입의 공통 SSOT
  - page 구현 수정과 contract 수정 지점을 분리해서 후속 작업 진입 비용을 낮춤
- `card-insight-text.ts`
  - 설문 답변 라벨 디코딩, 제목/문장/톤 정규화, 공통 텍스트 helper 전담
  - `card-insights.ts`, `ReportSummaryCards.tsx`, 관리자 통합 결과 미리보기에서 재사용
- `detail-data-model.ts`
  - 건강 지표 행, 복약/약사 요약 데이터, 복약 메타 포맷의 공통 SSOT
  - `ReportSummaryCards.tsx`와 관리자 통합 결과 미리보기가 같은 상세 데이터 조립 규칙을 공유
- `overview-model.ts`
  - 1페이지 건강점수 도넛, 생활습관 위험도 레이더, 건강관리 필요도 bar view-model 전담
  - `ReportSummaryCards.tsx`와 이후 관리자 preview가 같은 overview 계산 규칙을 재사용할 수 있는 진입점
- `survey-detail-model.ts`
  - 생활습관 실천 가이드, 영역별 분석 코멘트, 영양 설계 row 조립과 survey detail pagination 입력 전담
  - first-page/continuation 분리와 health/medication 페이지 번호 계산을 메인 파일 밖에서 관리
- `survey-detail-groups.ts`
  - `SurveyDetailPages.tsx`의 영역별 분석 코멘트 normalization/grouping helper 전담
  - continuation line 처리와 섹션 제목 fallback 규칙을 렌더링 파일 밖으로 분리
- `SurveyDetailPages.tsx`
  - 설문 상세 다중 페이지(위험 하이라이트/생활습관/영역 코멘트/영양 설계) 렌더링 전담
  - `ReportSummaryCards.tsx` 본문 길이를 줄이고 후속 UI 수정 범위를 국소화

## 수정 가이드

- UI 문구 톤/문장 변환 규칙 수정: `card-insights.ts`
- overview / health / medication 페이지 문구 수정: `copy.ts`
- overview / health / medication 페이지 prop/text 타입 계약 수정: `page-contracts.ts`
- 답변 라벨 해석/문장 정규화 규칙 수정: `card-insight-text.ts`
- 1페이지 차트/점수/영역 필요도 계산 수정: `overview-model.ts`
- 설문 상세 row 조립, first-page/continuation 분리, page number 규칙 수정: `survey-detail-model.ts`
- 설문 상세 영역 코멘트 grouping/normalization 규칙 수정: `survey-detail-groups.ts`
- 건강 지표/복약/약사 요약 데이터 조립 수정: `detail-data-model.ts`
- 점수/뱃지/상태 색상 규칙 수정: `helpers.ts`
- 관리자 요약 카드 구성/데이터 집계 수정: `view-model.ts`

## 최소 검증

- `npm run audit:encoding`
- `npm run lint`
- `npx next build`
