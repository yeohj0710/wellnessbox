# Employee Report Sync Actions Extraction

## Background

`EmployeeReportClient` still contained two long auth/sync handlers:

- `handleRestartAuth`
- `handleSignAndSync`

These handlers bundled validation, busy-state transitions, NHIS preflight,
sync recovery, and guidance/error branching in the root component.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-sync-actions.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now delegates restart-auth and sign-sync orchestration to
the new hook while preserving behavior and existing UI wiring.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-sync-actions-extraction.cts`
- npm script:
  - `qa:employee-report:sync-actions-extraction`

Guard verifies:

- client imports/uses the extracted sync-actions hook
- client no longer inlines restart/sign handlers
- hook owns `runRestartAuthFlow` and `runSyncFlowWithRecovery` orchestration
