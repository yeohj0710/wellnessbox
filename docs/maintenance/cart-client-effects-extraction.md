# Cart Client Effects Extraction

## Background

`components/order/cart.tsx` still contained several client-only side effects inline:

- `closeCart` global event subscription
- password + SDK bootstrap from localStorage/window
- localStorage persistence for password/products/selected pharmacy
- Escape key close + mobile browser `popstate` close behavior

Those concerns are unrelated to render composition and made the component harder to scan.

## What changed

### 1) Persistence hook extraction

- `components/order/hooks/useCartClientPersistence.ts`
  - bootstrap: password and Iamport SDK loaded-state
  - persistence: password, products list, selected pharmacy id

### 2) Overlay close behavior hook extraction

- `components/order/hooks/useCartOverlayCloseBehavior.ts`
  - `closeCart` event handling
  - Escape key close behavior
  - mobile `history.pushState` + `popstate` close behavior

### 3) Cart component simplification

- `components/order/cart.tsx`
  - removed legacy inline effect blocks
  - now composes:
    - `useCartClientPersistence(...)`
    - `useCartOverlayCloseBehavior(...)`

## Validation guard

- `scripts/qa/check-cart-client-effects-extraction.cts`
- npm script: `qa:cart:client-effects-extraction`

Guard verifies:

- `Cart` imports and uses both extracted hooks
- legacy inline side-effect tokens are removed from `Cart`
- each hook owns expected responsibility tokens

