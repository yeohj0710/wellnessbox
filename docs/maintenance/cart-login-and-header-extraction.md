# cart login and header extraction

## Background
- `components/order/cart.tsx` included both:
  - login status sync orchestration (`getLoginStatus`, `subscribeAuthSyncEvent`)
  - fixed top header markup
- This made the root cart component harder to scan and increased coupling for follow-up edits.

## What Changed
- Added `components/order/hooks/useCartLoginStatus.ts`
  - owns login bootstrap + auth sync subscription
  - returns `{ loginStatus, safeLoginStatus }`
- Added `components/order/CartTopHeader.tsx`
  - owns the fixed cart top header layout
  - uses centralized copy tokens from `cart.copy.ts`
- Updated `components/order/cart.tsx`
  - now composes `useCartLoginStatus` and `CartTopHeader`
  - removed inline login-sync implementation and inline fixed header markup

## QA Guard
- Added `scripts/qa/check-cart-login-header-extraction.cts`
  - verifies cart imports/uses extracted hook + header component
  - verifies legacy inline tokens are removed
  - verifies hook owns login sync logic and header uses copy tokens
- Added script entry:
  - `qa:cart:login-header-extraction`

## Validation
- `npm run qa:cart:login-header-extraction`
- `npm run qa:cart:items-section-status-content-extraction`
- `npm run qa:cart:item-row-extraction`
- `npm run qa:cart:items-section-view-model-extraction`
- `npm run qa:cart:bulk-change-controls-extraction`
- `npm run qa:cart:copy-extraction`
- `npm run lint`
- `npm run build`
- `npm run audit:encoding`
