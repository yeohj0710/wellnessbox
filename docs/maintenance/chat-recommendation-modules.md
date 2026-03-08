# Chat Recommendation Modules

## Goal
- Keep `app/chat/hooks/useChat.recommendation.ts` focused on recommendation-price hydration orchestration instead of mixing home-data catalog fetch/cache, option picking, and category bucket building in one file.
- Give follow-up sessions a clear entry point for either stream-text hydration behavior or cached catalog shaping.

## Boundary
- `app/chat/hooks/useChat.recommendation.ts`
  - Recommendation section detection.
  - Resolved-price line replacement.
  - Missing-price line fallback hydration.
  - Category alias normalization for hydration.
- `app/chat/hooks/useChat.recommendation.catalog.ts`
  - `/api/home-data` fetch and in-memory cache.
  - Best-option selection and seven-day price normalization.
  - Category bucket building for fallback recommendations.

## Follow-up rule
1. Change text-hydration policy in `useChat.recommendation.ts` first.
2. Change home-data fetch/cache or option-picking heuristics in `useChat.recommendation.catalog.ts` first.
3. Keep `useChat.assistant.ts` limited to stream orchestration and let recommendation hydration stay behind `hydrateRecommendationPrices`.

## QA
- `npm run qa:chat:recommendation-modules`
