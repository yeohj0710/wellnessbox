# Survey Copy Constants Refactor

## Goal
- Extract large UI copy constants from `app/survey/survey-page-client.tsx` into a dedicated module.
- Improve readability and reduce page-level noise for future flow changes.
- Add an explicit QA check so copy extraction does not regress.
- Keep the copy file human-readable in Korean without `\uXXXX` escape sequences.

## Scope
- New copy module:
  - `app/survey/_lib/survey-page-copy.ts`
- Updated page:
  - `app/survey/survey-page-client.tsx`
- QA guard:
  - `scripts/qa/check-survey-copy-extraction.cts`
  - `scripts/qa/check-survey-copy-readability.cts`
  - npm script: `qa:survey:copy-extraction`
  - npm script: `qa:survey:copy-readability`
  - bundle script: `qa:survey:refactor-guards`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:survey:refactor-guards`
3. `npm run lint`
4. `npm run build`
