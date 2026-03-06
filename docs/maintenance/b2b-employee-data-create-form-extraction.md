# B2B Employee Data Create Form Extraction

## 목적
- `B2bAdminEmployeeDataClient`에 인라인으로 들어가 있던 신규 임직원 등록 폼 블록을 분리해
  클라이언트 파일의 책임을 상태/흐름 제어 중심으로 줄입니다.

## 적용 내용
- 신규 컴포넌트 추가:
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataCreateFormCard.tsx`
- 클라이언트 교체:
  - `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`
  - 인라인 `<details>` 생성 폼 제거 후 `B2bEmployeeDataCreateFormCard` 호출로 대체

## 회귀 방지 QA
- 스크립트:
  - `scripts/qa/check-b2b-employee-data-create-form-extraction.cts`
- NPM 스크립트:
  - `npm run qa:b2b:employee-data-create-form-extraction`

## 기대 효과
- 폼 UI/문구/입력 제약 수정 시 대상 파일 범위가 줄어듭니다.
- 후속 세션 에이전트가 클라이언트 로직과 입력 UI를 빠르게 분리해 파악할 수 있습니다.
