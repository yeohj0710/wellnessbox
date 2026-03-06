# B2B Employee Data Selection Lifecycle Refactor

## Goal
- Extract employee-list loading, selection, and detail-loading lifecycle from `B2bAdminEmployeeDataClient`.
- Keep the page component focused on UI state wiring and action triggers.
- Stabilize future maintenance by isolating selection lifecycle behavior.

## Scope
- New hook:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-selection-lifecycle.ts`
- Updated client:
  - `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-employee-data-selection-lifecycle.cts`
  - npm script: `qa:b2b:employee-data-selection-lifecycle`

## Hook Responsibility
- Employee list loading (`fetchEmployees`)
- Employee detail loading (`fetchEmployeeOps`)
- Auto-correction when selected employee disappears from list
- Auto-load detail when selected employee changes
- Refresh selected employee data

## Client Responsibility
- Input and toggle state (search, checkboxes, confirm inputs)
- Rendering sections and wiring handlers from action hooks

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:employee-data-selection-lifecycle`
3. `npm run qa:b2b:employee-data-busy-action`
4. `npm run qa:b2b:employee-data-forms`
5. `npm run qa:b2b:employee-data-actions`
6. `npm run lint`
7. `npm run build`
