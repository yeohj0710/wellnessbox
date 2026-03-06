# cart copy extraction

## Background
- `components/order/cart.tsx` mixed hard-coded UI copy with runtime logic.
- Regressions in cart copy are easy to reintroduce without static checks.

## What Changed
- Added `components/order/cart.copy.ts` as the single source of cart page copy.
- Updated `components/order/cart.tsx` to use:
  - `CART_COPY.fetchPharmacyErrorPrefix`
  - `CART_COPY.backButtonLabel`
  - `CART_COPY.pageTitle`
  - `buildUnavailableBulkChangeAlert(...)`

## QA Guard
- Added `scripts/qa/check-cart-copy-extraction.cts`:
  - verifies cart imports the copy module
  - verifies key copy tokens are used
  - verifies known mojibake markers are absent
- Added script entry:
  - `qa:cart:copy-extraction`

## Validation
- `npm run qa:cart:copy-extraction`
- `npm run lint`
- `npm run build`
- `npm run audit:encoding`
