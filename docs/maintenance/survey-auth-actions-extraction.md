# Survey Auth Actions Extraction

## Background

`SurveyPageClient` contained inline Kakao auth action handlers with remote
session synchronization logic:

- `ensureEmployeeSessionFromIdentity`
- `handleStartKakaoAuth`
- `handleConfirmKakaoAuth`

These handlers were tightly coupled to root component state and made the survey
client harder to maintain.

## What changed

- Added:
  - `app/survey/_lib/use-survey-auth-actions.ts`
- Updated:
  - `app/survey/survey-page-client.tsx`

`SurveyPageClient` now delegates auth action orchestration to
`useSurveyAuthActions`, while preserving existing UI state updates and sync
event behavior.

## QA guard

- Added:
  - `scripts/qa/check-survey-auth-actions-extraction.cts`
- npm script:
  - `qa:survey:auth-actions-extraction`

Guard verifies:

- client imports/uses the new auth-actions hook
- client no longer inlines extracted auth handlers
- hook owns NHIS init/sign + employee sync API flow
