# B2B Admin Survey Editor Navigation Extraction

## 목적
- `use-survey-editor-navigation`의 순수 계산/검증 로직을 별도 helper 모듈로 분리해
  훅 본문을 상태 흐름 중심으로 단순화합니다.

## 적용 내용
- 신규 helper 모듈:
  - `app/(admin)/admin/b2b-reports/_lib/survey-editor-navigation-helpers.ts`
  - 포함 함수:
    - `clampSectionIndex`
    - `resolveSectionFocusQuestionKey`
    - `findCurrentQuestionIndex`
    - `validateQuestionAnswerForNavigation`
    - `findFirstInvalidQuestionInSection`
- 신규 스크롤 훅:
  - `app/(admin)/admin/b2b-reports/_lib/use-survey-editor-question-scroller.ts`
  - 문항 ref 저장 및 화면 중앙 포커싱 스크롤 동작을 전담
- 훅 파일 정리:
  - `app/(admin)/admin/b2b-reports/_lib/use-survey-editor-navigation.ts`
  - 직접 검증/탐색 루프를 helper 호출로 대체
  - DOM 스크롤 구현을 스크롤 훅 호출로 위임

## 회귀 방지 QA
- 스크립트:
  - `scripts/qa/check-b2b-admin-survey-editor-navigation-extraction.cts`
- NPM 명령:
  - `npm run qa:b2b:admin-survey-editor-navigation-extraction`

## 기대 효과
- 섹션 이동/포커스/검증 로직 수정 시, helper 단위로 테스트 및 리뷰가 쉬워집니다.
- 훅은 UI 이벤트 흐름에 집중하고, 계산 로직은 재사용 가능한 순수 함수 계층으로 유지됩니다.
