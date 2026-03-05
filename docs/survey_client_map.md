# Survey Client Map

## Purpose
- Fast orientation for `/survey` code structure during follow-up sessions.
- Clarify state ownership vs UI ownership so refactors stay low-risk.

## Entry Points
- Route page: `app/survey/page.tsx`
- Main client orchestrator: `app/survey/survey-page-client.tsx`

## UI Boundaries
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

## Edit Guide
1. Intro/auth UI and copy:
   - `SurveyIntroPanel.tsx`
2. Survey movement, auto-focus, answer state:
   - `survey-page-client.tsx`
3. Survey phase visual layout:
   - `SurveySectionPanel.tsx`
4. Calculating/loading UX:
   - `SurveyCalculatingPanel.tsx`
5. Result cards and recommendations:
   - `SurveyResultPanel.tsx`

## Verification
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
- `npm run qa:b2b:public-survey-smoke`
- `npm run qa:auth-sync:contract`
