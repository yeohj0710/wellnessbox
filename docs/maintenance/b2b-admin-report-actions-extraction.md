# B2B Admin Report Actions Extraction

## Goal
- Reduce orchestration pressure in `B2bAdminReportClient` by extracting large async action handlers.
- Keep UI/client wiring readable while preserving existing behavior and guardrails.
- Make follow-up edits (survey save/export/regen/validation) faster and safer.

## Scope
- New hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-actions.ts`
- Updated client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-admin-report-actions-extraction.cts`
  - npm script: `qa:b2b:admin-report-actions-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-actions-extraction`
3. `npm run qa:b2b:admin-report-selection-lifecycle`
4. `npm run qa:b2b:admin-report-workspace-extraction`
5. `npm run lint`
6. `npm run build`
