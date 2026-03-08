# B2B Admin Report Client Map

## Purpose
- Keep `admin/b2b-reports` maintainable while preserving current behavior.
- Make follow-up sessions easier by clarifying boundaries between orchestration, types, utilities, and survey field UI.

## Current split
- Route shell/orchestration:
  - `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
- UI blocks:
  - `app/(admin)/admin/b2b-reports/_components/B2bAdminOpsHero.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeSidebar.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bEmployeeOverviewCard.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bNoteEditorPanel.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bAnalysisJsonPanel.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bLayoutValidationPanel.tsx`
- Survey field renderer:
  - `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`
- Client types:
  - `app/(admin)/admin/b2b-reports/_lib/client-types.ts`
- Client API:
  - `app/(admin)/admin/b2b-reports/_lib/api.ts`
  - detail/survey/analysis/note/report 조회 응답 계약을 `client-types.ts` 타입으로 고정
  - 오케스트레이터에서 `any` 파싱을 하지 않도록 API 레이어에서 타입 경계를 보장
- Client utilities:
  - `app/(admin)/admin/b2b-reports/_lib/client-utils.ts`
- Shared report payload type:
  - `lib/b2b/report-summary-payload.ts`

## Editing rules
1. API flow changes:
   - Edit `_lib/api.ts` first.
   - Keep `B2bAdminReportClient.tsx` focused on orchestration/state only.
   - Keep auth/guard logic in server routes (`app/api/admin/b2b/**`) unchanged unless explicitly required.
2. Survey input UI changes:
   - Edit `B2bSurveyEditorPanel.tsx` first.
   - Edit `SurveyQuestionField.tsx` when field-level control behavior changes.
   - Keep value contract: `onChangeValue(question, value)`.
3. Formatting/parsing/download logic:
   - Edit `client-utils.ts`.
   - Reuse existing utility functions instead of duplicating helpers in component files.
4. Type shape changes:
   - Edit `client-types.ts` first, then propagate compile errors in client/orchestration code.

## Regression checklist
- `npm run qa:cde:regression`
- `npm run lint`
- `npm run build`
