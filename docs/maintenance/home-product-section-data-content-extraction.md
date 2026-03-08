# Home Product Section Data/Content Extraction

## Summary

- Extracted the home-data fetch/cache/recovery lifecycle from `app/(components)/homeProductSection.tsx` into `app/(components)/useHomeProductSectionData.ts`.
- Extracted the main section composition plus product-detail/cart overlay rendering into `app/(components)/homeProductSection.content.tsx`.
- Kept `homeProductSection.tsx` focused on orchestration: local UI state, effect wiring, cart persistence callbacks, and hook composition.

## Why

- The previous file still mixed fetch/cache recovery logic with a large JSX shell.
- Future sessions usually need either the network/cache boundary or the rendered section tree, not both at once.
- Splitting these boundaries reduces false starts when debugging `/` or `/#home-products`.

## New Entry Points

- `app/(components)/homeProductSection.tsx`
  - Page-level orchestration and callback wiring.
- `app/(components)/useHomeProductSectionData.ts`
  - Home-data fetch/cache/recovery lifecycle and sorted category/product state.
- `app/(components)/homeProductSection.content.tsx`
  - Section composition plus product-detail/cart overlay rendering.

## Guard

- `npm run qa:home:data-content`
