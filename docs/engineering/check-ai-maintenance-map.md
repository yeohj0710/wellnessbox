# Check AI Maintenance Map

Purpose: help follow-up sessions modify Check AI flows without re-reading large pages.

## Scope

- Korean page: `app/check-ai/page.tsx`
- English page: `app/en/check-ai/page.tsx`
- Shared client helpers: `lib/checkai-client.ts`
- Shared timezone helper: `lib/timezone.ts`

## Current Boundaries

1. Page-level responsibilities
- Render questionnaire UI, submit action, modal state, and route-level side effects.
- Keep locale-specific copy in page files.

2. Shared client responsibilities (`lib/checkai-client.ts`)
- API score request and response normalization
- Minimum loading delay utility
- Local storage persistence key and payload shape
- Optional server persistence request (`/api/check-ai/save`)
- Category recommendation ID resolution from score results

3. English-only split modules
- `app/en/check-ai/prediction.ts`: ONNX session and local inference path
- `app/en/check-ai/content.ts`: category label/description mapping for modal
- `app/en/check-ai/translate-guard.ts`: Google Translate suppression in EN mode

4. Shared visual style module
- `components/check-ai/CheckAiAnimationStyles.tsx`: global keyframes (`pulseGlow`, `dotBounce`)

## Data Flow (Both Locales)

1. User answers questionnaire (unanswered defaults to neutral score 3).
2. Prediction source:
- KO: `/api/predict` via `requestCheckAiPredictScores`
- EN: ONNX local inference via `runEnglishCheckAiPrediction`
3. Normalized top scores are shown in result modal.
4. `persistCheckAiResult` stores local summary and best-effort posts to `/api/check-ai/save`.
5. `resolveRecommendedCategoryIds` maps score labels/codes to `CategoryLite.id` for downstream links.

## Safe Refactor Checklist

1. Do not change storage key shape without updating:
- `lib/checkai-client.ts`
- `app/chat/hooks/useChat.results.ts`

2. Keep `tzOffsetMinutes` persisted for analytics consistency.

3. Keep question fallback behavior (`0 -> 3`) unless model contract changes.

4. When changing modal UI or loading overlays, keep shared keyframe names:
- `pulseGlow`
- `dotBounce`

5. Validation before merge:
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`

