# Employee Report Panel Extraction

## Goal
- Reduce `EmployeeReportClient` complexity by extracting stable UI panels into dedicated components.
- Keep the client focused on auth/sync state orchestration.
- Improve readability and handoff speed for follow-up sessions.

## Scope
- New components:
  - `app/(features)/employee-report/_components/EmployeeReportAdminOnlyGate.tsx`
  - `app/(features)/employee-report/_components/EmployeeReportCapturePreview.tsx`
- Updated page:
  - `app/(features)/employee-report/EmployeeReportClient.tsx`
- QA guard:
  - `scripts/qa/check-employee-report-panel-extraction.cts`
  - npm script: `qa:employee-report:panel-extraction`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:employee-report:panel-extraction`
3. `npm run qa:employee-report:state-actions`
4. `npm run lint`
5. `npm run build`
