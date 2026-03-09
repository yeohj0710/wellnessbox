# B2B Admin Report Detail-State Extraction

## Goal
- Reduce orchestration pressure in `B2bAdminReportClient` by moving employee-detail state and bundle hydration into one hook.
- Prevent stale survey/note/analysis state from leaking across employee switches when a follow-up detail load fails.
- Give future sessions one obvious entry point for "detail data" behavior before touching save/export actions.

## Scope
- New hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-detail-state.ts`
- Pure hydration/model helper:
  - `app/(admin)/admin/b2b-reports/_lib/detail-state-model.ts`
- Updated client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- Shared preview tab type:
  - `app/(admin)/admin/b2b-reports/_lib/client-types.ts`
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportPreviewPanel.tsx`
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-selection-lifecycle.ts`

## Ownership
- `B2bAdminReportClient.tsx`
  - employee list state
  - search state
  - toast/busy orchestration
  - wiring selection lifecycle, refresh hooks, and action hooks
- `use-b2b-admin-report-detail-state.ts`
  - employee-detail React state for survey, note, analysis, validation, preview, and period selection
  - applying hydrated detail snapshots into local state
  - full detail reset on employee switch
- `detail-state-model.ts`
  - pure bundle hydration from `fetchEmployeeDetailBundle`
  - empty-state factory and loaded-state factory
  - period/display-period resolution rules

## Safety Note
- `clearEmployeeDetailState()` now resets all employee-scoped detail fields, not only report/validation metadata.
- This avoids showing the previous employee's survey or note data under a newly selected employee if the new detail fetch fails.
- Keep non-React parsing and merge logic inside `detail-state-model.ts` so future sessions can adjust payload mapping without touching hook state wiring.

## Validation
1. `npm run audit:encoding`
2. `npm run audit:hotspots`
3. `npm run lint`
4. `npm run build`
