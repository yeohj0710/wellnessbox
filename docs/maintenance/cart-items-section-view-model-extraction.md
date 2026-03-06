# cart items section view-model extraction

## Background
- `CartItemsSection` previously mixed rendering concerns with derived UI state and row resolution logic.
- Splitting pure derivation logic makes future refactors safer and easier to review.

## What Changed
- Added `components/order/cartItemsSection.view-model.ts`:
  - `buildResolvedCartItemRows`
  - `buildCartItemsSectionViewState`
  - `buildStockLimitAlertMessage`
- Updated:
  - `CartItemsSection` to use row/state derivation helpers
  - `CartItemRow` to use stock-limit alert helper

## QA Guard
- Updated `scripts/qa/check-cart-items-section-view-model-extraction.cts`:
  - section owns row/state derivation helper usage
  - row component owns stock alert helper usage
  - verifies helper exports exist in view-model module
- Script:
  - `qa:cart:items-section-view-model-extraction`

## Validation
- `npm run qa:cart:items-section-view-model-extraction`
- `npm run qa:cart:item-row-extraction`
- `npm run lint`
- `npm run build`
- `npm run audit:encoding`
