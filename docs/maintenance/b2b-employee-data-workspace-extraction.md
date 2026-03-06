# B2B Employee Data Workspace Extraction

## Goal
- Extract the right-side operations workspace from `B2bAdminEmployeeDataClient`.
- Keep the client component focused on state wiring and hook orchestration.
- Improve readability for follow-up changes in employee-data operations.

## Scope
- New component:
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx`
- Updated client:
  - `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-employee-data-workspace-extraction.cts`
  - npm script: `qa:b2b:employee-data-workspace-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:employee-data-layout-extraction`
3. `npm run qa:b2b:employee-data-workspace-extraction`
4. `npm run qa:b2b:employee-data-selection-lifecycle`
5. `npm run qa:b2b:employee-data-actions`
6. `npm run lint`
7. `npm run build`
