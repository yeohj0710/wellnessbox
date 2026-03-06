# B2B Admin Survey Editor Panel Refactor

## Background

`app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorPanel.tsx` mixed:

- guide/info copy blocks
- progress summary header UI
- section selector UI
- progress/recommended-range calculation logic

This made follow-up UI changes and copy updates slower than necessary.

## What changed

### 1) Extracted guide/progress/selector components

- Added:
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorGuidanceCard.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorProgressHeader.tsx`
  - `app/(admin)/admin/b2b-reports/_components/B2bSurveyEditorSectionSelector.tsx`
- `B2bSurveyEditorPanel` now composes these blocks.

### 2) Extracted progress helper module

- Added: `app/(admin)/admin/b2b-reports/_lib/survey-editor-progress.ts`
- Moved pure calculations:
  - recommended range copy resolver
  - effective progress percent resolver
  - done-count resolver

### 3) Added QA guard

- Added: `scripts/qa/check-b2b-admin-survey-editor-panel-extraction.cts`
- Added npm script:
  - `qa:b2b:admin-survey-editor-panel-extraction`

Guard verifies:

- panel composes extracted components
- panel uses shared progress helper functions
- extracted UI copy tokens are not duplicated back in the panel
