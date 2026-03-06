# Global Cart Host Hooks Extraction

## Background

`components/order/globalCartHost.tsx` had multiple concerns in one file:

- cart state signature dedupe + `cartUpdated` subscription
- road address localStorage sync + event listeners
- global cart open/close visibility control, route guard, scroll restore, body scroll lock
- product/pharmacy resolution and total price computation

This made future work slower because visibility and sync flows had to be edited in the same component body.

## What changed

### 1) New constants module

- `components/order/globalCartHost.constants.ts`
  - `MISSING_ADDRESS_ERROR`
  - `GLOBAL_CART_OPEN_KEY`
  - `GLOBAL_CART_LOCAL_STORAGE_OPEN_KEY`
  - `GLOBAL_CART_VISIBILITY_EVENT`
  - `notifyGlobalCartVisibility(visible)`

This also removed the previously broken mojibake text and restored the user-facing Korean message.

### 2) Extracted cart sync hook

- `components/order/hooks/useSyncedClientCartItems.ts`
  - initializes from `readClientCartItems()`
  - dedupes updates with `buildClientCartSignature`
  - subscribes to `cartUpdated` and keeps state in sync

### 3) Extracted address sync hook

- `components/order/hooks/useRoadAddressState.ts`
  - initializes from `localStorage.roadAddress`
  - subscribes to `addressUpdated` / `addressCleared`

### 4) Extracted visibility orchestration hook

- `components/order/hooks/useGlobalCartVisibility.ts`
  - handles `openCart` event
  - restores visibility from session marker
  - closes on route change
  - controls scroll restore and body overflow lock
  - emits global visibility custom event

### 5) Slimmed host component

- `components/order/globalCartHost.tsx` now composes:
  - `useSyncedClientCartItems`
  - `useRoadAddressState`
  - `useGlobalCartVisibility`
  - existing product/pharmacy/price effects

## Validation guard

- `scripts/qa/check-global-cart-host-hooks-extraction.cts`
- npm script: `qa:cart:global-cart-host-hooks-extraction`

The guard verifies:

- host imports and uses extracted hooks/constants
- legacy inline state/effects tokens were removed from host
- each new hook owns the expected responsibility tokens

