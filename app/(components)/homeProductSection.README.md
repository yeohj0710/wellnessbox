# Home Product Section Modules

## Goal

Keep `homeProductSection.tsx` focused on orchestration and UI composition, while moving reusable logic into helper/hook modules.

## Current Split

- `homeProductSection.tsx`
  - Home product screen orchestration, section composition, and cross-block state wiring.
- `homeProductSection.helpers.ts`
  - Pure helpers for cache read, product filtering, cart total calculation, and symptom-category resolution.
- `homeProductSection.copy.ts`
  - Package labels and user-facing copy constants (Korean default).
- `useHomeProductPharmacy.ts`
  - Nearby-pharmacy fetch/retry lifecycle (address guard, empty-stock fallback, loading/error state).
- `useHomeProductActions.ts`
  - Product detail/cart open-close callbacks, return-path restore, and scroll restoration orchestration.
- `useHomeProductSectionEffects.ts`
  - Stable barrel export surface for home section effect hooks.
- `useHomeProductSectionEffects.ui.ts`
  - UI sync effects (cart sync listeners, hash/open-cart events, footer visibility control).
- `useHomeProductSectionEffects.query.ts`
  - Search param synchronization effects (package/category/product/cart query handling).
- `useHomeProductSectionEffects.lifecycle.ts`
  - Lifecycle effects (cache bootstrap, cart restore, recovery fetch, address-clear handling).
- `useHomeProductSectionEffects.computation.ts`
  - Computation effects (total price, symptom->category mapping, stock-aware cart prune, filtered products).
- `homeProductSectionEffects.types.ts`
  - Shared effect input type aliases used across effect modules.
- `homeProductSection.view.tsx`
  - View-only shared status/notice components.

## Maintenance Rules

- Keep text/copy in `homeProductSection.copy.ts` and avoid inline English-only labels.
- Keep network side effects in hooks/modules before extending `homeProductSection.tsx`.
- Keep filter/cart math in `homeProductSection.helpers.ts` as pure functions.
