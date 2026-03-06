# cart items section row and copy extraction

## Background
- `CartItemsSection` had become a mixed unit containing:
  - status branching
  - item row rendering
  - quantity actions
  - UI copy literals
- That structure slowed down follow-up edits and made regression review harder.

## What Changed
- Added `components/order/CartItemRow.tsx`
  - owns per-item UI and quantity/remove actions
- Added `components/order/cartItemsSection.copy.ts`
  - centralizes section-level and row-level copy keys
- Added `components/order/CartItemsSectionStatusContent.tsx`
  - owns loading/error/missing/unresolved/empty/list branching
- Simplified `components/order/cartItemsSection.tsx`
  - now composes: title + status-content + bulk-controls

## QA Guard
- Added `scripts/qa/check-cart-item-row-extraction.cts`
- Added `scripts/qa/check-cart-items-section-status-content-extraction.cts`
- Updated `scripts/qa/check-cart-items-section-view-model-extraction.cts`
- Script entries:
  - `qa:cart:item-row-extraction`
  - `qa:cart:items-section-status-content-extraction`

## Validation
- `npm run qa:cart:item-row-extraction`
- `npm run qa:cart:items-section-status-content-extraction`
- `npm run qa:cart:items-section-view-model-extraction`
- `npm run qa:cart:bulk-change-controls-extraction`
- `npm run qa:cart:copy-extraction`
- `npm run lint`
- `npm run build`
- `npm run audit:encoding`
