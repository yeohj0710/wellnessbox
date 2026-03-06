# Employee Report Session Bootstrap Extraction

## Background

`EmployeeReportClient` contained a large inline bootstrap function:

- `checkSessionAndMaybeAutoLogin`

The function mixed:

- session restore from API
- stored-identity auto-login fallback
- admin-only gate branching
- report preload handoff
- booting/error state transitions

This made the root client harder to reason about and slower for follow-up edits.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-session-bootstrap.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now receives `checkSessionAndMaybeAutoLogin` from the
new hook and keeps orchestration wiring in place.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-session-bootstrap-extraction.cts`
- npm script:
  - `qa:employee-report:session-bootstrap-extraction`

Guard verifies:

- client imports/uses the new bootstrap hook
- client no longer inlines `fetchEmployeeSession` + stored-identity read logic
- hook owns session bootstrap behavior
