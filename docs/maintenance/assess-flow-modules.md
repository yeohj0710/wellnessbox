# Assess Flow Modules

## Summary

- Extracted derived progress/question/recommendation state from `app/assess/useAssessFlow.ts` into `app/assess/useAssessFlow.derived.ts`.
- Extracted storage hydration/persistence, DOM keyboard/focus effects, category fetch, and loading-timer cleanup into `app/assess/useAssessFlow.lifecycle.ts`.
- Moved the shared section union into `app/assess/useAssessFlow.types.ts` so future follow-up work can import it without reaching back into the main hook.

## Why

- The previous hook mixed question-flow actions with unrelated lifecycle work and derived render state.
- Future sessions usually need one of three concerns only: question navigation/submission, derived progress/current-question state, or storage/DOM/fetch effects.
- This split keeps `useAssessFlow.ts` focused on state transitions and makes `/assess` follow-up changes easier to localize.

## New Entry Points

- `app/assess/useAssessFlow.ts`
  - Main assess flow orchestration: state, back/answer/submit handlers, and wiring.
- `app/assess/useAssessFlow.derived.ts`
  - Recommended category ids, current question lookup, progress counts/messages, and section title.
- `app/assess/useAssessFlow.lifecycle.ts`
  - Storage hydrate/persist, keyboard/focus effects, body scroll lock, category fetch, and loading-timer cleanup.
- `app/assess/useAssessFlow.types.ts`
  - Shared `AssessSection` contract.

## Guard

- `npm run qa:assess:flow-modules`
