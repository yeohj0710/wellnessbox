# Cart Interaction Controller Extraction

## Why

`components/order/cart.tsx` still kept several imperative interaction handlers
inline even after login/client-effect/cart-copy extractions:

- address save + nearby pharmacy re-selection
- product detail open/close + scroll restore
- add-to-cart persistence
- phone modal open/unlink/link callbacks
- bulk option-change persistence
- checkout confirm / pharmacy detail modal toggles

That left the root cart component with too much local interaction code and made
follow-up edits slower than necessary.

## What changed

- Added `components/order/hooks/useCartInteractionController.ts`
  - owns local cart interaction state and handlers
  - reuses `updateCartAndPersist` from `components/order/cartItemsSection.actions.ts`
- Updated `components/order/cart.tsx`
  - reduced to hook composition + section/modal rendering

## Boundary

- `cart.tsx`
  - root orchestration, payment hook wiring, section composition
- `useCartInteractionController.ts`
  - address/pharmacy/detail/phone/confirm modal state
  - cart item persistence handlers
  - local browser-only interaction callbacks
- `cartItemsSection.actions.ts`
  - shared cart persistence helper used by both row actions and cart-level handlers

## Validation

- `npm run qa:cart:interaction-controller-extraction`
- `npm run qa:cart:copy-extraction`
- `npm run qa:cart:login-header-extraction`
- `npm run qa:cart:client-effects-extraction`
- `npm run lint`
- `npm run build`
