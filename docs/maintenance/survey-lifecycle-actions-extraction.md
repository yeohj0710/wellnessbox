# Survey Lifecycle Actions Extraction

## Background

`SurveyPageClient` contained multiple inline lifecycle action handlers:

- `requestReset`
- `handleReset`
- `handleStartSurvey`
- `handleRenewalHoldStart`
- `handleRenewalHoldEnd`

These handlers touched many state setters/refs and increased root component
coupling.

## What changed

- Added:
  - `app/survey/_lib/use-survey-lifecycle-actions.ts`
- Updated:
  - `app/survey/survey-page-client.tsx`

`SurveyPageClient` now delegates start/reset/renewal-hold lifecycle actions to
`useSurveyLifecycleActions` while preserving reset side-effects, local storage
cleanup, and authenticated snapshot reset persistence.

## QA guard

- Added:
  - `scripts/qa/check-survey-lifecycle-actions-extraction.cts`
- npm script:
  - `qa:survey:lifecycle-actions-extraction`

Guard verifies:

- client imports/uses lifecycle-actions hook
- client no longer inlines lifecycle action handlers
- hook owns lifecycle action callback implementations
