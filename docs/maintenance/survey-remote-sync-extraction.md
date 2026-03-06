# Survey Remote Sync Extraction

## Background

`SurveyPageClient` included inline remote survey synchronization logic:

- survey snapshot save (`persistSurveySnapshot`)
- remote survey bootstrap fetch + restore
- debounced draft autosave effect

The block was reusable infrastructure logic and increased client-root density.

## What changed

- Added:
  - `app/survey/_lib/use-survey-remote-sync.ts`
- Updated:
  - `app/survey/survey-page-client.tsx`

`SurveyPageClient` now delegates remote sync orchestration to
`useSurveyRemoteSync`, while preserving period key sync, local-vs-remote
freshness comparison, and debounced autosave behavior.

## QA guard

- Added:
  - `scripts/qa/check-survey-remote-sync-extraction.cts`
- npm script:
  - `qa:survey:remote-sync-extraction`

Guard verifies:

- client imports/uses the new remote-sync hook
- client no longer inlines request/snapshot save/fetch sync logic
- hook owns survey GET/PUT sync flow
