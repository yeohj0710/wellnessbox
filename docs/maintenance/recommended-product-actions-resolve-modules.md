# Recommended Product Actions Resolve Modules

## Goal
- Keep `app/chat/components/recommendedProductActions.resolve.ts` focused on category fallback policy and final recommendation assembly instead of mixing product-name catalog fetch caching and name-match scoring in one file.
- Preserve the existing `resolveRecommendations` import path while making the fetch, predicate-gating, and name-match boundaries obvious for follow-up sessions.

## Boundary
- `app/chat/components/recommendedProductActions.resolve.ts`
  - Resolve cache key, category fallback policy, category scoring, and final recommendation assembly.
- `app/chat/components/recommendedProductActions.resolve.catalog.ts`
  - Product-name catalog fetch, response normalization, retry cooldown, and TTL cache.
- `app/chat/components/recommendedProductActions.resolve.name.ts`
  - Name tokenization, token overlap scoring, and product-name candidate ranking.
- `app/chat/components/recommendedProductActions.resolve.category.ts`
  - Placeholder-product and category-like predicate helpers used to decide when category fallback should activate.

## Follow-up rule
1. Change product-name catalog fetch/cache behavior in `recommendedProductActions.resolve.catalog.ts`.
2. Change name scoring heuristics in `recommendedProductActions.resolve.name.ts`.
3. Change placeholder/category-like fallback gates in `recommendedProductActions.resolve.category.ts`.
4. Keep category fallback aliases, category scoring, and final recommendation assembly in `recommendedProductActions.resolve.ts`.

## QA
- `npm run qa:chat:recommended-product-actions-resolve`
