# AGENTS.md

## Project Overview (for Codex)
- Stack: Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, Capacitor.
- Core domains: checkout/orders, pharmacy/rider ops, push notifications, Kakao auth, assessment AI, chat/RAG.
- Server data flow is mainly in `lib/*` server modules and `app/api/*` route handlers.

## Project Map (Read This First)
- `app/`: App Router pages, layouts, and route groups for user/admin/pharm/rider UX.
- `app/api/`: server route handlers (`route.ts`) for auth, payment, push, chat, RAG, and profile flows.
- `app/(orders)/`: checkout completion and order lookup UI; calls `createOrder` and push customer APIs.
- `app/(admin)/`: admin login/page UI; login calls `/api/verify-password`.
- `app/(pharm)/`, `app/(rider)/`: pharmacy/rider dashboards; push registration/status APIs are called from here.
- `lib/`: reusable server/domain logic (order, auth, notification, ai, db, session, helpers).
- `lib/order/`: order queries/mutations/status constants; mutations hold stock/order integrity rules.
- `lib/server/`: request actor, client linkage, and route auth guard utilities.
- `middleware.ts`: locale rewrite/cookie logic plus admin route protection and client-id cookie issuance.

Source of truth modules and invariants:
- `lib/order/mutations.ts`
  - `createOrder` normalizes/merges items and runs in `db.$transaction`.
  - stock decrement is done inside transaction via `tx.pharmacyProduct.updateMany(... stock: { gte })`.
  - duplicate `paymentId` returns existing order instead of creating a second one.
  - do not move stock decrement back to client code.
- `lib/server/route-auth.ts`
  - central guards: `requireAdminSession`, `requireAnySession`, `requirePharmSession`, `requireRiderSession`, `requireCustomerOrderAccess`.
  - `requireCustomerOrderAccess` checks ownership by `appUserId` or normalized phone match.
  - API routes should import guards from here instead of ad-hoc session checks.
- `lib/db.ts`
  - Prisma singleton pattern uses `globalThis` cache in non-production.
  - do not instantiate new `PrismaClient` in feature modules.
- `lib/admin-token.ts` + `middleware.ts`
  - admin cookie token is HMAC-based (`buildAdminCookieToken` / `isValidAdminCookieToken`).
  - token is issued in `/api/verify-password`; middleware verifies token on protected paths.
  - protected path roots are currently `"/features"` and `"/admin"` in `isProtectedPath`.

Mini flow sketches:
- Order flow (checkout complete path):
  - `app/(orders)/order-complete/page.tsx`
  - -> `/api/get-payment-info` (payment verification)
  - -> `lib/order/mutations.ts:createOrder` (transaction: stock decrement + order create)
  - -> `lib/order/queries.ts:getOrderByPaymentId` (render summary)
  - -> optional `/api/push/subscribe` and `/api/push/send`
- Push flow (customer/pharm/rider):
  - client gets browser subscription (`ensureCustomerPushSubscription` or dashboard push helpers)
  - -> `/api/push/*` or `/api/pharm-push/*` or `/api/rider-push/*`
  - -> guard check in `lib/server/route-auth.ts` (ownership or role session)
  - -> persistence/send via `lib/notification.ts`
- Admin auth flow:
  - `app/(admin)/admin-login/page.tsx` submits password to `/api/verify-password`
  - -> server sets session + admin token cookie (from `lib/admin-token.ts`)
  - -> request to `/admin` hits `middleware.ts` protected-path check
  - -> admin APIs (for example `/api/admin/model`) also require `requireAdminSession`

Where to make changes:
- Order creation/integrity rules: `lib/order/mutations.ts` (and `lib/order/orderStatus.ts` for status constants).
- API auth or ownership policy: `lib/server/route-auth.ts` first, then apply in `app/api/**/route.ts`.
- Admin gate behavior: `middleware.ts` (`isProtectedPath`) and `app/api/verify-password/route.ts`.
- Push behavior and fanout: `lib/notification.ts` + specific route handlers under `app/api/push*`.
- Payment verification logic: `app/api/get-payment-info/route.ts`.
- Request validation for a route: inside that route’s `app/api/.../route.ts` before domain calls.

## Non-Negotiable Guardrails
- Do not expose operational routes without auth.
  - Admin-only routes: `app/api/admin/model`, `app/api/agent-playground/run`, `app/api/rag/*`
  - Use `requireAdminSession` from `lib/server/route-auth.ts`.
- Do not modify push routes without ownership checks.
  - Customer routes must use `requireCustomerOrderAccess`.
  - Pharmacy/rider routes must use `requirePharmSession` / `requireRiderSession`.
- Never store admin plaintext password in cookies.
  - Keep the flow aligned across:
    - `app/api/verify-password/route.ts`
    - `lib/admin-token.ts`
    - `middleware.ts`
- Keep stock decrement inside order transaction only.
  - `lib/order/mutations.ts` must remain the source of truth for create-order stock mutation.
  - Do not re-introduce client-side stock decrement after order creation.
- Keep Prisma singleton pattern in `lib/db.ts`.

## Recommended Work Order
1. Scope impact first with `rg`.
2. Check auth and access paths first (`route-auth`, `middleware`, session usage).
3. Apply bug fix with explicit input validation and type safety.
4. Run validation in order: `npm run lint` -> `npm run build`.
5. For order/push/auth changes, do a manual flow check (login, checkout complete, push subscribe status).

## Priority Areas (Performance and Stability)
- P1: auth/access regressions and operational endpoint exposure.
- P2: order integrity (duplicate order, stock underflow, partial failures).
- P3: runtime stability (Prisma connection pressure, repeated network calls).
- P4: dev/build loop efficiency (avoid duplicate pre scripts).

## Common Commands
- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start: `npm run start`
- Prisma generate: `npm run predev` or `npx prisma generate`
- Client audit helper: `npm run audit:clients`

## Common Mistakes to Avoid
- Adding DB write routes in `app/api/*` without role/ownership checks.
- Trusting `orderId`, `pharmacyId`, `riderId` from request body alone.
- Splitting order creation and stock decrement between server and client.
- Reverting admin auth back to plain cookie equality checks.
- Instantiating new `PrismaClient` per import location.
- Re-introducing `dev/build` script duplication by manually calling pre hooks inside script bodies.
