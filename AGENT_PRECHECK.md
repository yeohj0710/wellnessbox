# Agent Preflight Checklist

Purpose: speed up new coding sessions by checking structural risks first, before feature work.

## 1) Fast Baseline

Run these in order:

```bash
npm run audit:encoding
npm run audit:hotspots
npm run lint
npm run build
# Optional (DB-connected env): client ID linkage/quality audit
npm run audit:clients
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

`audit:clients` gives (optional):
- client cookie/client row/user linkage quality trends
- short-lived client ratio and user-agent concentration for hygiene checks

## 2) Non-Negotiable Invariants

- Route auth/ownership must use `lib/server/route-auth.ts` guards.
- Order stock mutation must stay in `lib/order/mutations.ts:createOrder` transaction.
- Prisma client must stay singleton via `lib/db.ts`.
- User-facing UI copy defaults to Korean (`ko-KR`) unless explicitly requested otherwise.
- Admin gate must stay aligned across:
  - `app/api/verify-password/route.ts`
  - `lib/admin-token.ts`
  - `middleware.ts`

## 3) High-Impact Hotspots

When touching these files, prefer block-level extraction over in-place growth:

- `app/chat/hooks/useChat.ts`
- `app/(components)/homeProductSection.tsx`
- `lib/chat/context.ts`
- `components/order/orderDetails.tsx`
- `app/my-data/page.tsx`
- `app/chat/components/recommendedProductActions.utils.ts`

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
- Chat hook split:
  - `app/chat/hooks/useChat.ts` = lifecycle orchestration + state wiring
  - `app/chat/hooks/useChat.agentGuide.ts` = capability ranking + guide examples
  - `app/chat/hooks/useChat.sendMessageFlow.ts` = send branch selection
  - `app/chat/hooks/useChat.actionFlow.ts` = cart/action decision branch handlers
  - `app/chat/hooks/useChat.copy.ts` = chat copy constants + error text mapping
  - `app/chat/hooks/useChat.lifecycle.ts` = bootstrap data loaders
  - `app/chat/hooks/useChat.bootstrap.ts` = bootstrap effect wrappers
  - `app/chat/hooks/useChat.ui.ts` = drawer/scroll helpers
  - `app/chat/hooks/useChat.interactionGuard.ts` = duplicate action guard
  - `app/chat/hooks/useChat.derived.ts` = summary/context payload builders + guide visibility logic
- Desktop dock split:
  - `components/chat/DesktopChatDock.tsx` = dock shell and trigger
  - `components/chat/DesktopChatDockPanel.tsx` = UI composition shell
  - `components/chat/useDesktopChatDockLayout.ts` = layout state + viewport clamp + dock layout emit
  - `components/chat/useDesktopChatDockPointer.ts` = pointer move loop + drag/resize commit/persist
  - `components/chat/DesktopChatDock.layout.ts` = geometry/storage/event primitives
  - `components/chat/DesktopChatDockPanelHeader.tsx` = dock header actions
  - `components/chat/DesktopChatDockResizeOverlay.tsx` = resize hint and handles
  - `components/chat/DesktopChatDockPanel.loading.ts` = loading metadata helper
  - `components/chat/DesktopChatDockMessageFeed.tsx` = message feed composition
- Home product section split:
  - `app/(components)/homeProductSection.tsx` = page-level orchestration and UI composition
  - `app/(components)/homeProductSection.helpers.ts` = filter/cart/cache pure helpers
  - `app/(components)/homeProductSection.copy.ts` = package labels + user-facing copy constants
  - `app/(components)/useHomeProductPharmacy.ts` = nearby pharmacy resolve/retry state machine
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

- `lib/notification/subscriptions.ts` uses typed `PushSubscriptionPayload` + shared DB/log helpers.
- Keep route-level ownership guards intact; only persistence/logging logic belongs there.

## 7) NHIS Normalize Map

- Keep normalization responsibilities separated by module:
  - `lib/server/hyphen/normalize.ts`: top-level orchestrator/composer only
  - `lib/server/hyphen/normalize-shared.ts`: primitive/object/list helpers
  - `lib/server/hyphen/normalize-treatment.ts`: medical/medication flattening
  - `lib/server/hyphen/normalize-checkup.ts`: checkup list/yearly/overview shaping
  - `lib/server/hyphen/normalize-health-age.ts`: health-age summary projection
  - `lib/server/hyphen/normalize-recommendation.ts`: recommendation timeline/caution derivation
- If adding a new NHIS target, add a dedicated normalize module first, then wire it in `normalize.ts`.

## 8) Health-Link Utility Map

- Keep `/health-link` utility boundaries explicit:
  - `app/(features)/health-link/utils.ts`: barrel export only (stable import surface)
  - `app/(features)/health-link/utils-format.ts`: label/date/table/json formatting helpers
  - `app/(features)/health-link/utils-session.ts`: session-expiry + fetch-failure message policy
  - `app/(features)/health-link/utils-health-data.ts`: checkup/medication summarization logic
- For UI overflow bugs, prefer CSS containment/wrapping fixes in `HealthLinkClient.module.css` before changing data contracts.
