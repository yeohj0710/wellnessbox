# Employee Report Report Loading Extraction

## Background

`EmployeeReportClient` still kept two shared data loaders inline:

- `loadReport`
- `syncEmployeeReport`

These were cross-cutting functions used by bootstrap/session/sync flows, and
their inline placement increased root component complexity.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-report-loading.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now obtains `loadReport` and `syncEmployeeReport` from
the dedicated hook while preserving existing behavior.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-report-loading-extraction.cts`
- npm script:
  - `qa:employee-report:report-loading-extraction`

Guard verifies:

- client imports/uses the new report-loading hook
- client no longer inlines `loadReport`/`syncEmployeeReport`
- hook owns API fetch + sync reload orchestration
