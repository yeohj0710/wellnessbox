# B2B Admin Report Workspace Extraction

## Goal
- Keep `B2bAdminReportWorkspace` as a state-switching shell instead of a large mixed rendering file.
- Separate loaded-detail panels from empty/loading/error placeholder states.
- Give future sessions explicit entry points for workspace shell, loaded panels, and shared prop contracts.

## Scope
- Workspace shell:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.tsx`
- Loaded-panel composition:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.loaded.tsx`
- Placeholder states:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.states.tsx`
- Shared prop contracts:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.types.ts`
- Workspace model hook:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-workspace-model.ts`
- Updated client:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- QA guard:
  - `scripts/qa/check-b2b-admin-report-workspace-extraction.cts`
  - npm script: `qa:b2b:admin-report-workspace-extraction`

## Responsibility
- `B2bAdminReportWorkspace.tsx`
  - branch by selection/loading/detail-available state
  - delegate to placeholder states or loaded workspace
- `B2bAdminReportWorkspace.loaded.tsx`
  - compose overview, preview, survey, note, analysis, validation panels
- `B2bAdminReportWorkspace.states.tsx`
  - own selection placeholder copy
  - own detail-missing fallback copy
- `B2bAdminReportWorkspace.types.ts`
  - keep grouped `selection`, `content`, `actions` contracts in one place
  - keep shell props aligned with loaded props without repeating long flat prop lists
- `use-b2b-admin-report-workspace-model.ts`
  - own the memoized assembly of grouped workspace props
  - keep async handler wrapping out of the page client

## Edit Guide
- Change loading/empty/detail-missing behavior in `B2bAdminReportWorkspace.tsx` or `B2bAdminReportWorkspace.states.tsx`.
- Change actual right-column panel order or composition in `B2bAdminReportWorkspace.loaded.tsx`.
- Change workspace prop shape in `B2bAdminReportWorkspace.types.ts` first, then follow compile errors outward.
- `B2bAdminReportClient.tsx` should call `use-b2b-admin-report-workspace-model.ts` and pass `workspace.selection`, `workspace.content`, `workspace.actions` into the workspace shell.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-report-workspace-extraction`
3. `npm run qa:b2b:admin-report-selection-lifecycle`
4. `npm run lint`
5. `npm run build`
