# Order-Complete Bootstrap/Notification Extraction

## Summary

- Extracted payment verification, duplicate-order lookup, order creation, and recovery routing from `app/(orders)/order-complete/page.tsx` into `app/(orders)/order-complete/useOrderCompleteBootstrap.ts`.
- Extracted customer push subscribe/send/unsubscribe handlers into `app/(orders)/order-complete/useOrderCompleteNotifications.ts`.
- Added `orderComplete.client.ts` for cart restore/clear and customer account key persistence, plus `orderComplete.copy.ts` for Korean-first alert/page copy.

## Why

- The route mixed payment bootstrap, order mutation orchestration, push notification actions, local-storage cleanup, and UI rendering in one client file.
- Follow-up sessions usually need either the checkout bootstrap path or the post-payment notification path, not both at once.
- Keeping the route shell small makes checkout regressions easier to isolate without touching `lib/order/mutations.ts`.

## Entry Points

- `app/(orders)/order-complete/page.tsx`
  - Route shell and success/cancelled/notify rendering.
- `app/(orders)/order-complete/useOrderCompleteBootstrap.ts`
  - Payment verification, duplicate-order resolution, order creation, and recovery routing.
- `app/(orders)/order-complete/useOrderCompleteNotifications.ts`
  - Push subscribe/send/unsubscribe handlers and notification state.
- `app/(orders)/order-complete/orderCompleteFlow.ts`
  - Payment-context parsing, draft hydration, outcome normalization, and draft validation.
- `app/(orders)/order-complete/orderComplete.client.ts`
  - Cart restore/clear and local persistence helpers.

## Guard

- `npm run qa:order-complete:hooks`
