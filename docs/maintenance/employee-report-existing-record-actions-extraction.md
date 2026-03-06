# Employee Report Existing Record Actions Extraction

## Background

`EmployeeReportClient` had two overlapping action handlers:

- `handleFindExisting`
- `tryLoadExistingReport`

Both contained repeated flows around:

- `upsertEmployeeSession` 호출
- 기존 기록 없음/리포트 없음 분기
- 저장된 identity 동기화
- 관리자 전용 차단 분기

This increased branch duplication and made future behavior updates risky.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-existing-record-actions.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now delegates existing-record retrieval actions to the
new hook and keeps the same user-facing behavior.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-existing-record-actions-extraction.cts`
- npm script:
  - `qa:employee-report:existing-record-actions-extraction`

Guard verifies:

- client imports/uses the extracted hook
- client no longer inlines `handleFindExisting`/`tryLoadExistingReport`
- hook owns `upsertEmployeeSession` branch flow
