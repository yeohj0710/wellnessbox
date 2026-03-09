# Survey Client Map

## Purpose
- Fast orientation for `/survey` code structure during follow-up sessions.
- Clarify state ownership vs UI ownership so refactors stay low-risk.

## Entry Points
- Route page: `app/survey/page.tsx`
- Main client orchestrator: `app/survey/survey-page-client.tsx`

## UI Boundaries
- Route-level page shell and phase routing:
  - `app/survey/_components/SurveyPageShell.tsx`
- Intro + identity/auth panel:
  - `app/survey/_components/SurveyIntroPanel.tsx`
- Survey phase panel (progress, section tabs, question cards, next/prev):
  - `app/survey/_components/SurveySectionPanel.tsx`
- Calculating phase panel:
  - `app/survey/_components/SurveyCalculatingPanel.tsx`
- Result panel:
  - `app/survey/_components/SurveyResultPanel.tsx`

## State Flow
- Phase: `intro -> survey -> calculating -> result`
- Persisted storage key: `b2b-public-survey-state.v4`
- Persistence normalizes transient `calculating` back to `survey`.

## Integration Edges
- Question build/validation:
  - `lib/b2b/public-survey.ts`
  - `buildPublicSurveyQuestionList`
  - `validateSurveyQuestionAnswer`
  - `resolveSelectedSectionsFromC27`
- Wellness analysis:
  - `lib/wellness/analysis.ts`
  - `computeWellnessResult`
- Identity/auth sync:
  - `app/(features)/employee-report/_lib/api.ts`
  - `lib/client/auth-sync.ts`
  - `app/survey/_lib/use-survey-auth-bootstrap.ts`
- Identity switch + reset:
  - `app/survey/_lib/use-survey-identity-switch.ts`
  - `app/survey/_lib/survey-state-reset.ts`
- Page-level derived UI state:
  - `app/survey/_lib/survey-page-client-model.ts`
  - `app/survey/_lib/use-survey-page-derived-state.ts`
- Admin login status + survey-phase access guard:
  - `app/survey/_lib/use-survey-page-access-control.ts`
- Page-level panel event adapters:
  - `app/survey/_lib/use-survey-page-action-handlers.ts`
- Panel prop/text assembly:
  - `app/survey/_lib/use-survey-page-panel-props.ts`
- Identity persistence + remote snapshot bridge:
  - `app/survey/_lib/use-survey-page-session-bridges.ts`
- Question/section/progress structure:
  - `app/survey/_lib/survey-page-structure-model.ts`
  - `app/survey/_lib/use-survey-page-structure.ts`
- Local restore/persist effects:
  - `app/survey/_lib/use-survey-page-persistence-effects.ts`
- Login refresh and UI housekeeping effects:
  - `app/survey/_lib/use-survey-page-ui-effects.ts`
- Answer-state mutations:
  - `app/survey/_lib/use-survey-answer-actions.ts`
- Progression/calculation:
  - `app/survey/_lib/use-survey-progression-actions.ts`
- Pure progression helpers:
  - `app/survey/_lib/survey-progression-helpers.ts`
- Result derivation:
  - `app/survey/_lib/survey-result-derivation.ts`

## Edit Guide
1. Intro/auth UI and copy:
   - `SurveyIntroPanel.tsx`
2. Session bootstrap and auth-sync reaction:
   - `use-survey-auth-bootstrap.ts`
3. Identity switch and survey reset policy:
   - `use-survey-identity-switch.ts`
   - `survey-state-reset.ts`
4. Answer edits, result invalidation, confirmed-question pruning:
   - `use-survey-answer-actions.ts`
5. Intro/result/survey labels, help text, navigation button state:
   - `survey-page-client-model.ts`
   - `use-survey-page-derived-state.ts`
6. Admin login refresh and survey-phase auth guard:
   - `use-survey-page-access-control.ts`
7. Intro/result/modal callback wiring:
   - `use-survey-page-action-handlers.ts`
8. Panel text/prop object assembly:
   - `use-survey-page-panel-props.ts`
9. Identity persistence and remote response application:
   - `use-survey-page-session-bridges.ts`
10. Route-level shell background and phase panel rendering:
   - `SurveyPageShell.tsx`
11. Question list, section grouping, and progress structure:
   - `survey-page-structure-model.ts`
   - `use-survey-page-structure.ts`
12. Local restore/persist and page housekeeping effects:
   - `use-survey-page-persistence-effects.ts`
   - `use-survey-page-ui-effects.ts`
13. Survey movement, auto-focus, final calculation:
   - `use-survey-progression-actions.ts`
14. Pure section validation and progression helper rules:
   - `survey-progression-helpers.ts`
15. Survey phase visual layout:
   - `SurveySectionPanel.tsx`
16. Calculating/loading UX:
   - `SurveyCalculatingPanel.tsx`
17. Result cards and recommendations:
   - `SurveyResultPanel.tsx`

## Verification
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
- `npm run qa:b2b:public-survey-smoke`
- `npm run qa:auth-sync:contract`
