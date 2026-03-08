# C~E Regression Stable Selectors

Purpose: keep Playwright-based C~E regression checks stable when labels/copy change.

## employee-report test ids

- `employee-report-summary-section`
- `employee-report-download-pdf`
- `employee-report-restart-auth`
- `employee-report-sign-sync`
- `employee-report-force-sync-panel`
- `employee-report-force-sync-summary`
- `employee-report-force-sync-open`
- `employee-report-force-sync-dialog`
- `employee-report-force-sync-checkbox`
- `employee-report-force-sync-input`
- `employee-report-force-sync-confirm`
- `employee-report-force-sync-cancel`

## notes

- `scripts/qa/verify-cde-regression.cjs` should prefer these selectors over text matching.
- If UI is refactored, update this document and the QA script together in one change.
