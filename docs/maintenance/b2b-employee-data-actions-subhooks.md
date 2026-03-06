# B2B Employee Data Actions Sub-hook Refactor

## Goal
- Reduce hotspot pressure in `useB2bEmployeeDataActions`.
- Separate non-destructive actions and destructive actions to make future edits safer.
- Consolidate Korean UI/operation copy in one source to avoid repeated mojibake regressions.

## Scope
- Main composer hook:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-actions.ts`
- New sub-hooks:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-employee-ops-actions.ts`
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-destructive-actions.ts`
- New copy constants:
  - `app/(admin)/admin/b2b-employee-data/_lib/employee-data-copy.ts`
- UI files migrated to shared copy:
  - `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataProfileSection.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataOperationsSection.tsx`

## QA Guard
- Updated:
  - `scripts/qa/check-b2b-employee-data-actions.cts`
- Added:
  - `scripts/qa/check-b2b-employee-data-copy-centralization.cts`
  - npm script: `qa:b2b:employee-data-copy-centralization`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:employee-data-actions`
3. `npm run qa:b2b:employee-data-copy-centralization`
4. `npm run qa:b2b:employee-data-selection-lifecycle`
5. `npm run qa:b2b:employee-data-layout-extraction`
6. `npm run lint`
7. `npm run build`
