# B2B Admin Report Workspace Extraction

## Goal
- Extract the large right-column workspace rendering block from `B2bAdminReportClient`.
- Keep the client focused on state orchestration and API action handlers.
- Make detail panel ownership explicit for faster follow-up edits.

## Scope
- New component:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.tsx`
- Updated client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-admin-report-workspace-extraction.cts`
  - npm script: `qa:b2b:admin-report-workspace-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-workspace-extraction`
3. `npm run qa:b2b:admin-report-selection-lifecycle`
4. `npm run lint`
5. `npm run build`
