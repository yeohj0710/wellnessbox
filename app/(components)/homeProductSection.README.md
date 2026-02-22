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
- `homeProductSection.view.tsx`
  - View-only shared status/notice components.

## Maintenance Rules

- Keep text/copy in `homeProductSection.copy.ts` and avoid inline English-only labels.
- Keep network side effects in hooks/modules before extending `homeProductSection.tsx`.
- Keep filter/cart math in `homeProductSection.helpers.ts` as pure functions.
