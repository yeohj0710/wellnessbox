# B2B Admin Report Preview Panel Extraction

## Goal
- Extract the large preview/capture/legacy-preview UI block from `B2bAdminReportClient`.
- Keep the client focused on state orchestration and action handlers.
- Make preview UI ownership explicit for faster follow-up edits.

## Scope
- New component:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportPreviewPanel.tsx`
- Updated client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-admin-report-preview-panel-extraction.cts`
  - npm script: `qa:b2b:admin-report-preview-panel-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-preview-panel-extraction`
3. `npm run qa:b2b:admin-report-selection-lifecycle`
4. `npm run lint`
5. `npm run build`
