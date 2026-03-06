# Employee Report Hero Extraction

## Goal
- Extract top hero/status header from `EmployeeReportClient`.
- Keep main client logic focused on state/sync handling.
- Make status UI ownership explicit for follow-up UI iterations.

## Scope
- New component:
  - `app/(features)/employee-report/_components/EmployeeReportHeroCard.tsx`
- Updated page:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`
- QA guard:
  - `scripts/qa/check-employee-report-hero-extraction.cts`
  - npm script: `qa:employee-report:hero-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:employee-report:hero-extraction`
3. `npm run qa:employee-report:panel-extraction`
4. `npm run lint`
5. `npm run build`
