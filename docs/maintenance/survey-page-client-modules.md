# Survey Page Client Modules

## Purpose

- Reduce follow-up session onboarding cost for `app/survey/survey-page-client.tsx`.
- Keep public survey changes low-risk by separating UI, persistence, auth, answer state, and progression flow.

## Current Boundaries

- Main state orchestration:
  - `app/survey/survey-page-client.tsx`
- Question input rendering:
  - `app/survey/_components/SurveyQuestionInput.tsx`
- Auto-compute and answer normalization:
  - `app/survey/_lib/survey-page-auto-compute.ts`
- Section, progress, and question helper logic:
  - `app/survey/_lib/survey-page-helpers.ts`
- Local storage restore/persist helpers:
  - `app/survey/_lib/survey-page-persistence.ts`
- Result derivation SSOT:
  - `app/survey/_lib/survey-result-derivation.ts`
- Identity auth request actions:
  - `app/survey/_lib/use-survey-auth-actions.ts`
- Auth bootstrap and auth-sync reaction:
  - `app/survey/_lib/use-survey-auth-bootstrap.ts`
- Identity switch and survey/auth reset flow:
  - `app/survey/_lib/use-survey-identity-switch.ts`
- Answer application and confirmed-question state:
  - `app/survey/_lib/use-survey-answer-actions.ts`
- Survey lifecycle actions:
  - `app/survey/_lib/use-survey-lifecycle-actions.ts`
- Shared survey draft reset helper:
  - `app/survey/_lib/survey-state-reset.ts`
- Pure survey structure rules:
  - `app/survey/_lib/survey-page-structure-model.ts`
- Memoized question/section/progress structure:
  - `app/survey/_lib/use-survey-page-structure.ts`
- Pure page-level view-model rules:
  - `app/survey/_lib/survey-page-client-model.ts`
- Memoized page-level derived state:
  - `app/survey/_lib/use-survey-page-derived-state.ts`
- Admin login refresh and survey-phase access guard:
  - `app/survey/_lib/use-survey-page-access-control.ts`
- Page-level panel event adapters:
  - `app/survey/_lib/use-survey-page-action-handlers.ts`
- Panel prop/text assembly:
  - `app/survey/_lib/use-survey-page-panel-props.ts`
- Identity persistence and remote snapshot application bridge:
  - `app/survey/_lib/use-survey-page-session-bridges.ts`
- Route-level page shell and phase rendering:
  - `app/survey/_components/SurveyPageShell.tsx`
- Restore/persist local survey state effects:
  - `app/survey/_lib/use-survey-page-persistence-effects.ts`
- Login refresh, drawer cleanup, section-completion, timer cleanup effects:
  - `app/survey/_lib/use-survey-page-ui-effects.ts`
- Survey progression and calculation flow:
  - `app/survey/_lib/use-survey-progression-actions.ts`
- Pure progression helper rules:
  - `app/survey/_lib/survey-progression-helpers.ts`
- Remote survey snapshot sync:
  - `app/survey/_lib/use-survey-remote-sync.ts`

## Edit Guide

1. Question input UX or option rendering:
   - `SurveyQuestionInput.tsx`
2. Stored snapshot structure or restore rules:
   - `survey-page-persistence.ts`
3. Kakao/NHIS auth request flow:
   - `use-survey-auth-actions.ts`
4. Session bootstrap and auth-sync listeners:
   - `use-survey-auth-bootstrap.ts`
5. Identity switch, stored-session clear, auth-sync emit:
   - `use-survey-identity-switch.ts`
   - `survey-state-reset.ts`
6. Answer edits, deselection sync, result invalidation on edit:
   - `use-survey-answer-actions.ts`
7. Question list, hidden-question filtering, section grouping, progress derivation:
   - `survey-page-structure-model.ts`
   - `use-survey-page-structure.ts`
8. Intro/survey/result view-model derivation:
   - `survey-page-client-model.ts`
   - `use-survey-page-derived-state.ts`
9. Admin login refresh and unauthenticated survey-phase guard:
   - `use-survey-page-access-control.ts`
10. Intro/result/modal UI event adapters:
   - `use-survey-page-action-handlers.ts`
11. Panel text object and prop assembly:
   - `use-survey-page-panel-props.ts`
12. Identity persistence and remote snapshot state application:
   - `use-survey-page-session-bridges.ts`
13. Route-level layout background and phase panel rendering:
   - `SurveyPageShell.tsx`
14. Local restore/persist effect flow:
   - `use-survey-page-persistence-effects.ts`
15. Login refresh and UI housekeeping effects:
   - `use-survey-page-ui-effects.ts`
16. Section movement, validation, calculation completion:
   - `use-survey-progression-actions.ts`
17. Pure section validation, current-question lookup, and effective structure recomputation:
   - `survey-progression-helpers.ts`
18. Remote snapshot merge policy:
   - `use-survey-remote-sync.ts`
19. Result recomputation rules:
   - `survey-result-derivation.ts`

## Notes

- `survey-page-client.tsx` should stay focused on state wiring and panel composition.
- Keep route-level gradient/background, modal placement, and phase-specific panel rendering in `SurveyPageShell.tsx`.
- Both lifecycle reset and identity switch reset should go through `survey-state-reset.ts`.
- Keep question-list generation, hidden-question filtering, section grouping, and progress math in `survey-page-structure-model.ts` / `use-survey-page-structure.ts`.
- Keep page-level booleans/labels/help-text logic in `survey-page-client-model.ts` and `use-survey-page-derived-state.ts`, not inline in `survey-page-client.tsx`.
- Keep admin login refresh and `survey -> intro` auth guard in `use-survey-page-access-control.ts`.
- Keep intro/result/modal callback adapters in `use-survey-page-action-handlers.ts` so panel prop wiring stays readable.
- Keep large `text={{...}}` blocks and modal prop assembly in `use-survey-page-panel-props.ts`.
- Keep `saveSurveyIdentity` and remote snapshot application rules in `use-survey-page-session-bridges.ts`, not inline in `survey-page-client.tsx`.
- Keep local restore/persist logic in `use-survey-page-persistence-effects.ts`, not inline in the page shell.
- Keep login refresh, result-screen drawer cleanup, section-completion carry-forward, and timer cleanup in `use-survey-page-ui-effects.ts`.
- If a change needs both answer mutation and section progression, update `use-survey-answer-actions.ts` first and keep `use-survey-progression-actions.ts` stateless where possible.
- Keep pure section validation and effective-structure recomputation in `survey-progression-helpers.ts`, not inline in the progression hook.
- Any new result recomputation path should go through `survey-result-derivation.ts` instead of calling wellness analysis helpers inline.

## Verification

- `npm run qa:survey:answer-actions-extraction`
- `npm run qa:survey:page-access-control`
- `npm run qa:survey:auth-actions-extraction`
- `npm run qa:survey:auth-bootstrap-extraction`
- `npm run qa:survey:identity-switch-extraction`
- `npm run qa:survey:page-action-handlers`
- `npm run qa:survey:page-derived-state`
- `npm run qa:survey:page-panel-props`
- `npm run qa:survey:page-shell-extraction`
- `npm run qa:survey:page-session-bridges`
- `npm run qa:survey:page-persistence-effects`
- `npm run qa:survey:page-ui-effects`
- `npm run qa:survey:progression-actions-extraction`
- `npm run qa:survey:progression-helper-modules`
- `npm run qa:survey:remote-sync-extraction`
- `npm run qa:b2b:survey-structure`
- `npm run qa:auth-sync:contract`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
