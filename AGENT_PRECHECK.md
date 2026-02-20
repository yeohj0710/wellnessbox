# Agent Preflight Checklist

Purpose: speed up new coding sessions by checking structural risks first, before feature work.

## 1) Fast Baseline

Run these in order:

```bash
npm run audit:encoding
npm run audit:hotspots
npm run lint
npm run build
```

Or run one command:

```bash
npm run preflight:agent
```

`audit:encoding` gives:
- mojibake and suspicious broken-text pattern checks across text/code files

`audit:hotspots` gives:
- runtime code hotspots + script hotspots by line count (refactor candidates)
- critical route guard checks for admin/rag/push endpoints

## 2) Non-Negotiable Invariants

- Route auth/ownership must use `lib/server/route-auth.ts` guards.
- Order stock mutation must stay in `lib/order/mutations.ts:createOrder` transaction.
- Prisma client must stay singleton via `lib/db.ts`.
- Admin gate must stay aligned across:
  - `app/api/verify-password/route.ts`
  - `lib/admin-token.ts`
  - `middleware.ts`

## 3) High-Impact Hotspots

When touching these files, prefer block-level extraction over in-place growth:

- `app/chat/hooks/useChat.ts`
- `components/chat/DesktopChatDock.tsx`
- `app/api/chat/actions/route.ts`
- `lib/chat/action-intent-rules.ts`
- `lib/chat/context.ts`
- `components/order/orderDetails.tsx`

## 4) Refactor Rule of Thumb

- Split only when boundaries are clear (pure helper, UI fragment, parser/mapper).
- Keep behavior equivalent first; optimize behavior in a separate pass.
- For auth/order/push changes, do manual flow checks after build:
  - login
  - checkout complete
  - my-orders lookup
  - push subscribe/status

## 5) Navigation Shell Notes

- `lib/useLoginStatus.ts` is the canonical source for `LoginStatus` type + normalization.
- Chat action planner split:
  - `app/api/chat/actions/route.ts` = model call + request/response orchestration
  - `lib/chat/action-intent-rules.ts` = regex intent rules + runtime-context flags + fallback action feedback
- Chat guide composition split:
  - `app/chat/hooks/useChat.ts` = hook state lifecycle + I/O orchestration
  - `app/chat/hooks/useChat.agentGuide.ts` = capability prioritization + guide example selection
  - `app/chat/hooks/useChat.ts` `finalizeAssistantTurn(...)` = shared post-response pipeline (title/suggestions/actions/persist)
- Header/nav ownership:
  - `components/common/topBar.tsx` = shell orchestration (route transitions + action wiring)
  - `components/common/topBar.header.tsx` = top header rendering
  - `components/common/topBar.drawer.tsx` = drawer rendering + overlay
  - `components/common/topBar.hooks.ts` = login/cart/scroll/logo hooks
  - `components/common/menuLinks.tsx` = menu controller state (admin reveal, AI dropdown, timers)
  - `components/common/menuLinks.desktop.tsx` = desktop menu rendering
  - `components/common/menuLinks.drawer.tsx` = drawer menu rendering
  - `components/common/menuLinks.shared.tsx` = shared badges/visibility/operator links
- If updating menu policy, keep desktop and drawer variants in sync.

## 6) Push Subscriptions

- `lib/notification/subscriptions.ts` now uses typed `PushSubscriptionPayload` + shared DB/log helpers.
- Keep route-level ownership guards intact; only persistence/logging logic belongs here.
