# B2B Admin Survey Question Field Refactor

## 목적
- `SurveyQuestionField`의 단일 대형 함수(문항 타입 분기 + JSX 렌더링 + 옵션 처리)를 유지보수 가능한 블록 단위로 분리합니다.
- 관리자 설문 입력 화면에서 깨진 한글 문구(모지바케)가 다시 유입되지 않도록 QA 가드를 추가합니다.

## 적용 내용
- 파일: `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`
  - 타입별 렌더러 컴포넌트 분리:
    - `MultiChoiceQuestionField`
    - `SingleChoiceQuestionField`
    - `NumberQuestionField`
    - `GroupQuestionField`
    - `TextQuestionField`
  - 메인 컴포넌트는 `switch (question.type)` 기반 디스패처로 단순화
  - 반복 버튼 클래스 로직을 `optionButtonClass` 헬퍼로 통합
  - 사용자 문구를 한국어 정상 문구로 교정
- 파일: `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.helpers.ts`
  - `variantLabel` 한국어 문구 교정

## 회귀 방지 QA
- 스크립트: `scripts/qa/check-b2b-admin-survey-question-field-refactor.cts`
  - 타입별 렌더러 함수 존재 검사
  - 메인 디스패처가 분리된 렌더러를 호출하는지 검사
  - `? + 한글` 형태의 모지바케 패턴 유입 검사
- 명령어:
  - `npm run qa:b2b:admin-survey-question-field-refactor`

## 기대 효과
- 문항 렌더링 로직 수정 시 영향 범위를 타입별로 국소화할 수 있습니다.
- 한국어 UI 문구 품질 저하(깨짐) 문제를 조기에 탐지할 수 있습니다.
