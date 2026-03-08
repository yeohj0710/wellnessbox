# Chat Interactive Action Route Modules

## Summary

- Extracted route navigation, page-focus fallback, and support link interactive action config/helpers out of `app/chat/hooks/useChat.interactiveActions.ts`.
- Added `app/chat/hooks/useChat.interactiveActions.routes.ts` for route/page-focus/support-link action tables plus execution helpers.
- Added `app/chat/hooks/useChat.interactiveActions.types.ts` for shared interactive action contracts reused by command/decision layers.

## Why

- The previous file mixed cart/profile/assessment commands with a large block of route-action config and page-action fallback logic.
- Follow-up sessions usually need either route-action definitions or the cart/profile/assessment execution branch, not both.
- Keeping the route-action data in one module makes future CTA additions safer and easier to review.

## Entry Points

- `app/chat/hooks/useChat.interactiveActions.ts`
  - Cart/profile/assessment interactive action orchestration.
- `app/chat/hooks/useChat.interactiveActions.routes.ts`
  - Route navigation, page-focus fallback, and support link action config/helpers.
- `app/chat/hooks/useChat.interactiveActions.types.ts`
  - Shared interactive action contracts.

## Guard

- `npm run qa:chat:interactive-actions-modules`
