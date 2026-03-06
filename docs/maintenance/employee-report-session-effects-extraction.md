# Employee Report Session Effects Extraction

## Background

`app/(features)/employee-report/EmployeeReportClient.tsx` had two inline
session-related effect blocks:

- admin-only blocked 상태에서 관리자 로그인 감지 후 자동 재확인
- auth-sync 이벤트 구독 후 세션/리포트 재동기화

Those side-effects were tightly coupled to the client root and made follow-up
session maintenance slower.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-session-effects.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now delegates session/auth-sync side-effects to the new
hook while preserving behavior.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-session-effects-extraction.cts`
- npm script:
  - `qa:employee-report:session-effects-extraction`

Guard verifies:

- client imports and uses the extracted hook
- client no longer inlines `subscribeAuthSyncEvent` logic
- hook owns admin re-check and auth-sync subscription effects
