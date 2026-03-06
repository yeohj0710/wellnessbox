# Survey Result Panel Components Refactor

## Background

`app/survey/_components/SurveyResultPanel.tsx` had grown large and mixed:

- chart card layout/rendering
- high-risk/lifestyle/section advice/supplement sections
- action footer block
- inline text that was difficult to maintain consistently across survey and admin preview

There were also mojibake-like strings in related result files.

## What changed

### 1) Summary cards extraction

- Added: `app/survey/_components/SurveyResultSummaryCards.tsx`
- Owns:
  - health score donut card
  - lifestyle radar card
  - health-management risk bars card

### 2) Action footer extraction

- Added: `app/survey/_components/SurveyResultActionSection.tsx`
- Owns:
  - "다음 단계" helper copy
  - edit/restart actions

### 3) Result panel cleanup

- Rewritten: `app/survey/_components/SurveyResultPanel.tsx`
- Now composes:
  - `SurveyResultSummaryCards`
  - section blocks (high risk, lifestyle guide, section advice, supplement design)
  - `SurveyResultActionSection`
- Restored Korean-facing copy and removed mojibake-like literal tokens.

### 4) Summary metric label normalization

- Rewritten: `app/survey/_lib/survey-result-summary.ts`
- Restored lifestyle risk labels used by radar chart:
  - 식습관 위험도
  - 활동량 위험도
  - 면역관리 위험도
  - 수면 위험도

### 5) Admin integrated preview copy normalization

- Rewritten: `app/(admin)/admin/b2b-reports/_components/B2bIntegratedResultPreview.tsx`
- Kept same transformation logic, normalized user-facing Korean copy.

## Validation guard

- Added: `scripts/qa/check-survey-result-panel-refactor.cts`
- npm script: `qa:survey:result-panel-refactor`

Guard verifies:

- panel composes extracted components
- expected Korean copy tokens exist
- summary labels are normalized
- admin integrated preview copy is normalized
- known mojibake markers are absent in target files

