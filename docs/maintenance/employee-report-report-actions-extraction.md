# Employee Report Report Actions Extraction

## Background

`EmployeeReportClient` still had four inline operational handlers:

- `handleDownloadPdf`
- `handleDownloadLegacyPdf`
- `handleLogout`
- `handleChangePeriod`

These handlers mixed report download/session teardown/period reload behavior in
the root component and increased maintenance noise.

## What changed

- Added:
  - `app/(features)/employee-report/_lib/use-employee-report-report-actions.ts`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now delegates the four operational handlers to the new
hook while preserving existing behavior wiring.

## QA guard

- Added:
  - `scripts/qa/check-employee-report-report-actions-extraction.cts`
- npm script:
  - `qa:employee-report:report-actions-extraction`

Guard verifies:

- client imports/uses the extracted hook
- client no longer inlines the four handlers
- hook owns PDF download + NHIS unlink/session teardown flows
