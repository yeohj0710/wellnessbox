# B2B Admin Report Toast Effects Extraction

## Background

`app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx` contained inline
toast side-effects for notice/error state.

The logic was simple but duplicated the same effect pattern used elsewhere in
the project and made the client root noisier.

## What changed

- Added:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-toast-effects.ts`
- Updated:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`

`B2bAdminReportClient` now delegates notice/error toast lifecycle to the new
hook, preserving behavior:

- success toast duration: `3200ms`
- error toast duration: `5000ms`
- consumed messages are cleared (`setNotice("")`, `setError("")`)

## QA guard

- Added:
  - `scripts/qa/check-b2b-admin-report-toast-effects-extraction.cts`
- npm script:
  - `qa:b2b:admin-report-toast-effects-extraction`

Guard validates:

- client imports and uses the new hook
- client no longer inlines toast side-effects
- hook owns the success/error toast behavior
