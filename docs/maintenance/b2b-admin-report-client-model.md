# B2B Admin Report Client Model

## Goal
- Keep `B2bAdminReportClient.tsx` focused on hook orchestration and page-level composition.
- Move pure survey-progress logic into a helper module and memoized client derivation into focused hooks.
- Make future sessions inspect one file for "client-side derived data" before touching hooks or JSX.

## Scope
- Client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- Pure model helpers:
  - `app/(admin)/admin/b2b-reports/_lib/b2b-admin-report-client-model.ts`
- Derived-state hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-derived-state.ts`
- Workspace model hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-workspace-model.ts`
- Related QA:
  - `scripts/qa/check-b2b-admin-survey-sync.cts`
  - `scripts/qa/check-b2b-admin-report-workspace-extraction.cts`

## Responsibility
- `B2bAdminReportClient.tsx`
  - hook composition
  - event wiring
  - page shell rendering
- `b2b-admin-report-client-model.ts`
  - survey answer casting
  - selected-section resolution from C27
  - completion-stat calculation
  - selected employee lookup
- `use-b2b-admin-report-derived-state.ts`
  - memoized selected employee lookup
  - selected-section derivation
  - completion-stat derivation
  - dirty-state summary
- `use-b2b-admin-report-workspace-model.ts`
  - grouped workspace `selection`, `content`, `actions` assembly
  - async handler wrapping for the workspace prop contract

## Edit Guide
- Change C27-driven selected-section derivation in `b2b-admin-report-client-model.ts` first.
- Change completion-stat shaping in `b2b-admin-report-client-model.ts` and verify `use-b2b-admin-report-derived-state.ts`.
- Change workspace prop grouping in `use-b2b-admin-report-workspace-model.ts` before touching the workspace component tree.
- Keep side-effect hooks in `B2bAdminReportClient.tsx`; do not move busy/refresh/toast lifecycle into the pure model file.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-survey-sync`
3. `npm run qa:b2b:admin-report-workspace-extraction`
4. `npm run lint`
5. `npm run build`
