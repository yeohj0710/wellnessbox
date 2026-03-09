# B2B Admin Survey Question Field Refactor

## Goal
- Keep `SurveyQuestionField` focused on question-type dispatch only.
- Separate shared UI primitives from type-specific renderers so future edits do not require scanning one large JSX file.
- Keep the admin survey question UI Korean-first and guard against mojibake regressions.

## Scope
- Dispatcher:
  - `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.tsx`
- Type-specific renderers:
  - `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.renderers.tsx`
- Shared UI primitives and props:
  - `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.shared.tsx`
- Answer/variant helpers:
  - `app/(admin)/admin/b2b-reports/_components/SurveyQuestionField.helpers.ts`
- QA guard:
  - `scripts/qa/check-b2b-admin-survey-question-field-refactor.cts`
  - npm script: `qa:b2b:admin-survey-question-field-refactor`

## Responsibility
- `SurveyQuestionField.tsx`
  - resolve variant context
  - dispatch by `question.type`
- `SurveyQuestionField.renderers.tsx`
  - render `multi`, `single`, `number`, `group`, `text` question UIs
  - keep option-selection payload shaping close to the renderer that uses it
- `SurveyQuestionField.shared.tsx`
  - shared card/header/variant selector UI
  - shared renderer prop contract
- `SurveyQuestionField.helpers.ts`
  - variant key resolution
  - option filtering and variant answer shaping
  - group answer serialization

## Edit Guide
- Change copy, spacing, or shared layout first in `SurveyQuestionField.shared.tsx`.
- Change question-type behavior in `SurveyQuestionField.renderers.tsx`.
- Change variant payload shape or group-answer serialization in `SurveyQuestionField.helpers.ts`.
- Only touch `SurveyQuestionField.tsx` when a new question type or dispatch rule is added.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:b2b:admin-survey-question-field-refactor`
3. `npm run lint`
4. `npm run build`
