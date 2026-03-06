# Survey Result Summary Refactor

## Goal
- Reduce complexity in `SurveyResultPanel` by moving heavy summary-card calculations to a pure helper module.
- Keep panel responsibilities focused on rendering and interaction wiring.
- Add QA guardrails so this refactor does not regress.

## Scope
- New helper module:
  - `app/survey/_lib/survey-result-summary.ts`
- Updated panel:
  - `app/survey/_components/SurveyResultPanel.tsx`
- New QA:
  - `scripts/qa/check-survey-result-summary-refactor.cts`
  - npm script: `qa:survey:result-summary-refactor`
  - bundled in: `qa:survey:refactor-guards`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:survey:result-summary-refactor`
3. `npm run qa:survey:refactor-guards`
4. `npm run lint`
5. `npm run build`
