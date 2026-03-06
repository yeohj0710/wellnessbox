# B2B Employee Data Layout Extraction

## Goal
- Reduce `B2bAdminEmployeeDataClient` render complexity by extracting the hero and sidebar layout blocks.
- Keep the client focused on state wiring and operation handlers.
- Provide explicit component ownership for follow-up UI/UX edits.

## Scope
- New components:
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataOpsHero.tsx`
  - `app/(admin)/admin/b2b-employee-data/_components/B2bEmployeeDataSidebar.tsx`
- Updated client:
  - `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-employee-data-layout-extraction.cts`
  - npm script: `qa:b2b:employee-data-layout-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:employee-data-layout-extraction`
3. `npm run qa:b2b:employee-data-selection-lifecycle`
4. `npm run qa:b2b:employee-data-actions`
5. `npm run lint`
6. `npm run build`
