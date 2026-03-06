# Survey Modal Components Refactor

## Goal
- Move inline modal renderers in `app/survey/survey-page-client.tsx` into dedicated components.
- Keep `survey-page-client` focused on state/flow orchestration.
- Reduce the blast radius for future modal design or copy changes.

## Scope
- New components:
  - `app/survey/_components/SurveyRenewalModal.tsx`
  - `app/survey/_components/SurveyResetConfirmModal.tsx`
- Updated page:
  - `app/survey/survey-page-client.tsx`
- QA guard:
  - `scripts/qa/check-survey-modal-components.cts`
  - npm script: `qa:survey:modal-components`

## Validation
1. `npm run audit:encoding`
2. `npm run qa:survey:modal-components`
3. `npm run lint`
4. `npm run build`
