# B2B Admin Report Selection Lifecycle

## Goal
- Keep employee list loading, default selection, and detail loading logic readable in `B2bAdminReportClient`.
- Reduce the scope of follow-up changes around selection correction and detail refresh.
- Keep the employee list contract aligned with the employee-data admin flow.

## Scope
- Selection lifecycle hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-selection-lifecycle.ts`
- Main client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- Shared contract touchpoint:
  - `lib/b2b/admin-employee-management-contract.ts`
  - `lib/b2b/admin-report-contract.ts`
- Local client type facade:
  - `app/(admin)/admin/b2b-reports/_lib/client-types.ts`
- QA:
  - `scripts/qa/check-b2b-admin-report-selection-lifecycle.cts`
  - npm script: `qa:b2b:admin-report-selection-lifecycle`

## Responsibility
- Initial employee list loading
- Selection correction when the employee list changes
- Detail bundle loading for the selected employee
- Resetting detail state when selection becomes invalid

## Contract Note
- Employee list rows should follow `lib/b2b/admin-employee-management-contract.ts`.
- `app/(admin)/admin/b2b-reports/_lib/client-types.ts` should remain a thin facade over the shared contract instead of redefining `EmployeeListItem`.
- Survey/analysis/note/report GET response types should follow `lib/b2b/admin-report-contract.ts`.
- Survey/note/analysis/report mutation response types should also follow `lib/b2b/admin-report-contract.ts`.
- If the admin report client needs a new server field, add it to the shared contract first and then re-export it from `app/(admin)/admin/b2b-reports/_lib/client-types.ts`.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-selection-lifecycle`
3. `npm run qa:b2b:admin-report-busy-action`
4. `npm run qa:b2b:admin-background-refresh`
5. `npm run lint`
6. `npm run build`
