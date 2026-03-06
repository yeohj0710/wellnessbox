# cart bulk-change controls extraction

## Background
- Bulk-change button group and confirmation modal logic lived inline in `CartItemsSection`.
- This made the section harder to scan and harder to update safely.

## What Changed
- Added `components/order/CartBulkChangeControls.tsx`:
  - button set for bulk option targets
  - confirm modal state and drag handling
  - dispatch via `onBulkChange(confirmType)`
- Updated `CartItemsSection` to render `CartBulkChangeControls` only.

## QA Guard
- Added `scripts/qa/check-cart-bulk-change-controls-extraction.cts`:
  - verifies section imports/renders bulk controls component
  - verifies legacy inline modal tokens are removed from section
  - verifies draggable modal ownership in new component
- Script:
  - `qa:cart:bulk-change-controls-extraction`

## Validation
- `npm run qa:cart:bulk-change-controls-extraction`
- `npm run qa:cart:items-section-status-content-extraction`
- `npm run lint`
- `npm run build`
- `npm run audit:encoding`
