# Recommended Product Actions Controller Extraction

## Goal
- Keep `app/chat/components/RecommendedProductActions.tsx` as a shell instead of mixing recommendation resolve effects, cart/address guard state, feedback timers, and two draggable modals into one component.
- Give follow-up sessions a clear entry point for recommendation CTA behavior changes.

## Boundary
- `app/chat/components/RecommendedProductActions.tsx`
  - Shell composition for the list, confirm dialog, address guide modal, and address modal.
- `app/chat/components/useRecommendedProductActionsController.ts`
  - Recommendation parsing/resolution lifecycle.
  - Expanded state, feedback timer, pending cart action state.
  - Confirm dialog state, recommendation resolve effect, and address-save follow-up orchestration.
- `app/chat/components/recommendedProductActions.controller-support.ts`
  - Confirm dialog payload copy, address persistence helper, and pending-cart feedback text rules.
- `app/chat/components/RecommendedProductActionList.tsx`
  - Header, summary, preview chips, loading rows, and resolved item CTA rows.
- `app/chat/components/RecommendedProductAddressGuideModal.tsx`
  - Address guidance modal shell.
- `app/chat/components/RecommendedProductConfirmDialog.tsx`
  - Confirm/cancel modal shell.

## Follow-up rule
1. Change recommendation CTA behavior in `useRecommendedProductActionsController.ts` first.
2. Change confirm dialog copy or address-save success feedback in `recommendedProductActions.controller-support.ts` first.
3. Keep pricing/normalization helpers under `recommendedProductActions.utils.ts` and its focused helper files.
4. Keep `RecommendedProductActions.tsx` limited to shell composition and modal mounting.

## QA
- `npm run qa:chat:recommended-product-actions`
