# B2B Admin Survey Editor Panel Refactor

## Goal
- Keep `B2bSurveyEditorPanel` focused on state calculation and layout composition.
- Split section-tab rendering, question-list rendering, and footer actions into explicit modules.
- Make survey-editor follow-up work faster by giving each UI region one obvious file owner.

## Scope
- Main panel:
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx`
- Extracted panel sections:
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionTabs.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorQuestionList.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorActions.tsx`
- Existing extracted blocks still used by the panel:
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorGuidanceCard.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorProgressHeader.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionSelector.tsx`
- Shared progress helpers:
  - `app/(admin)/admin/b2b-reports/_lib/survey-editor-progress.ts`
- QA guard:
  - `scripts/qa/check-b2b-admin-survey-editor-panel-extraction.cts`
  - npm script: `qa:b2b:admin-survey-editor-panel-extraction`

## Responsibility
- `B2bSurveyEditorPanel.tsx`
  - derive editor sections and progress values
  - wire navigation hook outputs to UI blocks
  - compose the overall editor layout
- `B2bSurveyEditorSectionTabs.tsx`
  - render section navigation chips
- `B2bSurveyEditorQuestionList.tsx`
  - render the current section's question cards
  - render empty-state copy when no questions are visible
- `B2bSurveyEditorActions.tsx`
  - render previous/next/save actions

## Edit Guide
- Change navigation tab look or behavior in `B2bSurveyEditorSectionTabs.tsx`.
- Change question-card list layout or empty-state handling in `B2bSurveyEditorQuestionList.tsx`.
- Change footer CTA copy or button layout in `B2bSurveyEditorActions.tsx`.
- Only touch `B2bSurveyEditorPanel.tsx` when section composition or hook wiring changes.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-survey-editor-panel-extraction`
3. `npm run lint`
4. `npm run build`
