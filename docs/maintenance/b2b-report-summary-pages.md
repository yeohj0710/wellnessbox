# B2B Report Summary Pages

## 목적

- `components/b2b/ReportSummaryCards.tsx`가 "payload 해석 + 페이지 조립" 흐름에 집중하도록 정리합니다.
- 후속 작업 시 페이지 레이아웃 수정, 설문 상세 pagination 수정, 카드 계산 수정의 진입점을 분리합니다.

## 현재 구조

- 메인 조립과 view model 계산:
  `components/b2b/ReportSummaryCards.tsx`
- 1페이지 / 건강검진 / 복약 페이지 렌더링:
  `components/b2b/report-summary/ReportSummaryPages.tsx`
- 설문 상세 카드 연속 페이지 렌더링:
  `components/b2b/report-summary/SurveyDetailPages.tsx`
- 설문 상세 pagination 규칙과 페이지 분할:
  `components/b2b/report-summary/survey-detail-pagination.ts`
- 카드 해석 helper:
  `components/b2b/report-summary/card-insights.ts`
- overview / health / medication 페이지 카피 SSOT:
  `components/b2b/report-summary/copy.ts`
- overview / health / medication 페이지 prop/text 계약:
  `components/b2b/report-summary/page-contracts.ts`
- 1페이지 overview(건강점수/생활습관 위험도/건강관리 필요도) 계산:
  `components/b2b/report-summary/overview-model.ts`
- 설문 상세 row 조립 / first-page split / 이후 페이지 번호 계산:
  `components/b2b/report-summary/survey-detail-model.ts`
- 설문 상세 영역 코멘트 grouping / normalization helper:
  `components/b2b/report-summary/survey-detail-groups.ts`
- 건강 지표 / 복약 / 약사 요약 공통 상세 데이터 조립:
  `components/b2b/report-summary/detail-data-model.ts`
- 공통 formatting helper:
  `components/b2b/report-summary/helpers.ts`

## 수정 기준

- 건강점수, 생활습관 위험도, 건강관리 필요도, 복약/약사 섹션 데이터 계산 변경:
  `components/b2b/ReportSummaryCards.tsx`
- overview / health / medication 페이지 문구 변경:
  `components/b2b/report-summary/copy.ts`
- overview / health / medication 페이지 prop/text 타입 계약 변경:
  `components/b2b/report-summary/page-contracts.ts`
- 1페이지 도넛/레이더/영역 필요도 view-model 규칙 변경:
  `components/b2b/report-summary/overview-model.ts`
- 설문 상세 line/supplement 조립, continuation 분리, health/medication 페이지 번호 규칙 변경:
  `components/b2b/report-summary/survey-detail-model.ts`
- 설문 상세 영역 코멘트 grouping/normalization 규칙 변경:
  `components/b2b/report-summary/survey-detail-groups.ts`
- 건강 지표 행, 복약 목록, 약사 코멘트 공통 조립 규칙 변경:
  `components/b2b/report-summary/detail-data-model.ts`
- 각 페이지의 제목, 문구, 카드 배치 변경:
  `components/b2b/report-summary/ReportSummaryPages.tsx`
- 설문 상세 카드의 페이지 분할 규칙, 줄 단위 chunking, continuation 처리 변경:
  `components/b2b/report-summary/survey-detail-pagination.ts`
- 설문 상세 카드 자체의 표시 방식 변경:
  `components/b2b/report-summary/SurveyDetailPages.tsx`

## 메모

- `ReportSummaryPages.tsx`는 표시 전용 컴포넌트만 두고, 도메인 계산은 넣지 않습니다.
- `ReportSummaryPages.tsx`의 prop/text shape는 `page-contracts.ts`를 기준으로 맞춥니다.
- 첫 페이지 도넛/레이더/건강관리 필요도 계산은 `overview-model.ts`가 맡고, 메인 파일은 payload 조립과 페이지 배치만 담당합니다.
- 설문 상세 pagination 입력과 first-page/continuation 분리는 `survey-detail-model.ts`가 맡고, 메인 파일은 렌더 순서만 결정합니다.
- `SurveyDetailPages.tsx`의 섹션 묶음/질문 제목 fallback 규칙은 `survey-detail-groups.ts`를 기준으로 맞춥니다.
- 건강/복약 상세 데이터는 `ReportSummaryCards.tsx`와 관리자 통합 결과 미리보기가 `detail-data-model.ts`를 함께 사용합니다.
- `survey-detail-pagination.ts`는 순수 함수만 두고, 렌더링이나 payload 접근 로직은 넣지 않습니다.
