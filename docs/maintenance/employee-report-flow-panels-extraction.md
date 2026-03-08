# Employee Report Flow Panels Extraction

## Why

`app/(features)/employee-report/EmployeeReportClient.tsx` was still carrying three
separate rendering responsibilities:

- pre-report identity/auth guidance flow
- admin-only blocked gate copy/composition
- ready-report summary + preview composition

That kept the client file longer than necessary even after the action/loading
hooks had already been extracted.

## What changed

- Added shared UI copy/constants:
  - `app/(features)/employee-report/_lib/employee-report-copy.ts`
- Added flow wrapper components:
  - `app/(features)/employee-report/_components/EmployeeReportInputFlowPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportReadyPanel.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportAdminOnlySection.tsx`
- Updated:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`

`EmployeeReportClient` now focuses on state, hooks, and branch orchestration,
while the wrapper panels compose the leaf UI blocks near the states they belong
to.

## Follow-up guidance

- UI copy/layout changes should start in the wrapper panels first.
- Shared labels/phrases like admin-only notice text and force-confirm wording now
  live in `employee-report-copy.ts`.
- Keep leaf component changes local unless the flow boundary itself is moving.

## Guardrails

- No auth/session route behavior changed.
- No order/auth guard invariants were touched.
- Existing employee-report action hooks remain the source of operational logic.

## Validation

- `npm run qa:employee-report:panel-extraction`
- `npm run qa:employee-report:auth-ux`
- `npm run qa:employee-report:sync-notice`
- `npm run lint`
- `npm run build`
