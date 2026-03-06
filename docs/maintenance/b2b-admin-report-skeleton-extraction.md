# B2B Admin Report Skeleton Extraction

## Goal
- Reduce `B2bAdminReportClient` size by extracting long loading skeleton JSX blocks.
- Keep the page component focused on data flow and action orchestration.
- Improve readability for follow-up sessions and reduce accidental regressions in loading UI.

## Scope
- New components:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportBootstrappingSkeleton.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportDetailSkeleton.tsx`
- Updated page:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-admin-report-skeleton-extraction.cts`
  - npm script: `qa:b2b:admin-report-skeleton-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-skeleton-extraction`
3. `npm run lint`
4. `npm run build`
