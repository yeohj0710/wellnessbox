# Employee Report Sync Actions Subhooks

## Background

After introducing `useEmployeeReportSyncActions`, the hook itself became a new
hotspot because it still contained two large callbacks:

- restart-auth orchestration
- sign/sync orchestration

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-restart-auth-action.ts`
  - `app/(features)/employee-report/_lib/use-employee-report-sign-sync-action.ts`
- Updated:
  - `app/(features)/employee-report/_lib/use-employee-report-sync-actions.ts`

`useEmployeeReportSyncActions` now composes the two dedicated subhooks and keeps
only shared preflight wiring.

## QA guard

- Updated:
  - `scripts/qa/check-employee-report-sync-actions-extraction.cts`

Guard now verifies:

- client still delegates to `useEmployeeReportSyncActions`
- root sync-actions hook composes subhooks
- subhooks own `runRestartAuthFlow` and `runSyncFlowWithRecovery`
