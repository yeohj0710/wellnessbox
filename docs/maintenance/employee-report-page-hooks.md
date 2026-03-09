# Employee Report Page Hooks

## Purpose

- Reduce follow-up session onboarding cost for `app/(features)/employee-report/EmployeeReportClient.tsx`.
- Keep page-level derived state and UI event adapters out of the route client shell.

## Current Boundaries

- Main orchestration:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`
- Page-level derived view-model:
  - `app/(features)/employee-report/_lib/use-employee-report-page-derived-state.ts`
- Page-level input/dialog handlers:
  - `app/(features)/employee-report/_lib/use-employee-report-page-handlers.ts`
- Existing operational hooks:
  - `use-employee-report-report-loading.ts`
  - `use-employee-report-session-bootstrap.ts`
  - `use-employee-report-session-effects.ts`
  - `use-employee-report-existing-record-actions.ts`
  - `use-employee-report-sync-actions.ts`
  - `use-employee-report-report-actions.ts`

## Edit Guide

1. Input field normalization or force-sync dialog button behavior:
   - `use-employee-report-page-handlers.ts`
2. Period selector options, overlay text derivation, force-sync enablement:
   - `use-employee-report-page-derived-state.ts`
3. Actual auth/session/report operations:
   - existing `use-employee-report-*` operational hooks

## Notes

- Keep `EmployeeReportClient.tsx` focused on state wiring, auth-sync bridges, and panel composition.
- Keep page-level `useMemo` derivations out of the client shell when they do not own side effects.
- Keep UI-only adapters such as input normalization and confirm-dialog actions in `use-employee-report-page-handlers.ts`.
- Leave `emitAuthSyncEvent` bridges in `EmployeeReportClient.tsx` until auth-sync contract guards move to a dedicated module.

## Verification

- `npm run qa:employee-report:page-hooks`
- `npm run qa:employee-report:panel-extraction`
- `npm run qa:employee-report:report-actions-extraction`
- `npm run qa:employee-report:sync-actions-extraction`
- `npm run qa:employee-report:session-bootstrap-extraction`
- `npm run qa:employee-report:session-effects-extraction`
- `npm run qa:auth-sync:contract`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
