# B2B Employee Data Workspace Sections Extraction

## Goal
- Split `B2bEmployeeDataWorkspace` into section-level components.
- Improve maintainability by isolating profile/operations/summary/health-link UI blocks.
- Reduce follow-up change risk by narrowing each component responsibility.

## Scope
- New components:
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataProfileSection.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataOperationsSection.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataSummarySection.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataHealthLinkDetails.tsx`
- Updated workspace:
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataWorkspace.tsx`
- QA guard:
  - `scripts/qa/check-b2b-employee-data-workspace-sections-extraction.cts`
  - npm script: `qa:b2b:employee-data-workspace-sections-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:employee-data-workspace-sections-extraction`
3. `npm run qa:b2b:employee-data-workspace-extraction`
4. `npm run qa:b2b:employee-data-layout-extraction`
5. `npm run qa:b2b:employee-data-selection-lifecycle`
6. `npm run qa:b2b:employee-data-actions`
7. `npm run lint`
8. `npm run build`
