# AGENTS.md — WellnessBox (Codex)

## TL;DR (Read this first)

### Priority order (conflicts)

1. **Non-Negotiable Guardrails** (this file)
2. `docs/rnd/*` (requirements + KPI/eval) — **R&D tasks only**
3. `docs/rnd_impl/*` (optional notes) — use only if needed

### Golden rules (do not violate)

- **Auth/ownership:** All API routes must use guards from `lib/server/route-auth.ts` (no ad-hoc session checks).
- **Order integrity:** Keep stock decrement **inside** `lib/order/mutations.ts:createOrder` transaction only.
- **Prisma:** Preserve singleton pattern in `lib/db.ts` (never instantiate `PrismaClient` per module).
- **Admin gate:** Keep `/api/verify-password` + `lib/admin-token.ts` + `middleware.ts` aligned; never store plaintext admin password in cookies.

### Default work order

1. Scope impact with `rg`
2. Check auth/access paths first (`route-auth`, `middleware`, session usage)
3. Implement with explicit validation + type safety
4. Run `npm run lint` → `npm run build`
5. If touching order/auth/push: do a manual flow check

---

## Project Overview (for Codex)

- Stack: Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, Capacitor.
- Domains: checkout/orders, pharmacy/rider ops, push notifications, Kakao auth, assessment AI, chat/RAG.
- Server data flow: `lib/*` server modules + `app/api/*` route handlers.

## Product context

- 약국 기반 건강기능식품 소분 판매 플랫폼입니다.
- 건강기능식품 복용 최적화/안전 검증을 위한 Closed-loop AI 알고리즘 및 솔루션 구축을 함께 진행합니다.

---

## R&D Docs (TIPS Extension) — Read Rules (R&D tasks only)

This repo already contains a production platform. New TIPS R&D features must be added without breaking existing invariants.

### Doc layers

- `docs/rnd/*` = **REQUIREMENTS / objective spec** (must satisfy; includes KPI/eval + environment)
- `docs/rnd_impl/*` = **IMPLEMENTATION NOTES / optional** (use only if needed; ignore if conflicts with `docs/rnd/*`)

### Context-minimizing rule (token budget)

For any single R&D task, load only:

- `AGENTS.md` (always)
- `docs/rnd/01_kpi_and_evaluation.md` (always for R&D work)
- exactly **ONE** module spec: `docs/rnd/02~07_*.md` (the module you implement now)
- optional: matching `docs/rnd_impl/02~07_*_impl_notes.md` (only if needed)

Do NOT load all R&D docs at once unless explicitly required.

### How to start an R&D task

1. Choose module (02~07)
2. Identify required KPIs/evals from `docs/rnd/01_kpi_and_evaluation.md`
3. Implement as long as:
   - guardrails are not violated, and
   - module KPI/eval requirements are satisfied
4. Leave reproducible evaluation artifacts (scripts/configs/queries) so results can be re-checked

---

## Project Map (Read this first)

- `app/`: App Router pages/layouts/route groups (user/admin/pharm/rider UX)
- `app/api/`: route handlers (`route.ts`) for auth, payment, push, chat, RAG, profile
- `app/(orders)/`: checkout completion + order lookup UI; calls `createOrder` + push APIs
- `app/(admin)/`: admin login/page UI; login calls `/api/verify-password`
- `app/(pharm)/`, `app/(rider)/`: dashboards; push registration/status APIs
- `lib/`: server/domain logic (order, auth, notification, ai, db, session, helpers)
- `lib/order/`: order queries/mutations/status constants (integrity rules live here)
- `lib/server/`: request actor + route auth guards/utilities
- `middleware.ts`: locale/cookie logic + admin route protection + client-id cookie issuance

---

## Source of truth modules & invariants (read before changes)

### Order integrity

- `lib/order/mutations.ts`
  - `createOrder` runs in `db.$transaction`
  - stock decrement happens **inside** transaction via `tx.pharmacyProduct.updateMany(... stock: { gte })`
  - duplicate `paymentId` returns existing order (no double order)
  - **Do not** move stock decrement to client code

### Auth/ownership policy

- `lib/server/route-auth.ts`
  - guards: `requireAdminSession`, `requireAnySession`, `requirePharmSession`, `requireRiderSession`, `requireCustomerOrderAccess`
  - `requireCustomerOrderAccess` checks ownership by `appUserId` or normalized phone match
  - API routes must import guards from here (no ad-hoc checks)

### Prisma singleton

- `lib/db.ts`
  - Prisma singleton uses `globalThis` cache in non-production
  - **Do not** instantiate `PrismaClient` in feature modules

### Admin token gate

- `lib/admin-token.ts` + `middleware.ts` + `app/api/verify-password/route.ts`
  - admin cookie token is HMAC-based (`buildAdminCookieToken` / `isValidAdminCookieToken`)
  - token issued in `/api/verify-password`; middleware verifies token on protected paths
  - protected roots currently `"/features"` and `"/admin"` in `isProtectedPath`

---

## Mini flow sketches (for quick orientation)

### Order flow (checkout complete)

- `app/(orders)/order-complete/page.tsx`
  - → `/api/get-payment-info` (payment verification)
  - → `lib/order/mutations.ts:createOrder` (transaction: stock decrement + order create)
  - → `lib/order/queries.ts:getOrderByPaymentId` (render summary)
  - → optional `/api/push/subscribe` + `/api/push/send`

### Push flow (customer/pharm/rider)

- client obtains subscription (`ensureCustomerPushSubscription` or dashboard helpers)
  - → `/api/push/*` or `/api/pharm-push/*` or `/api/rider-push/*`
  - → guard check in `lib/server/route-auth.ts`
  - → persistence/send via `lib/notification.ts`

### Admin auth flow

- `app/(admin)/admin-login/page.tsx` → `/api/verify-password`
  - server sets session + admin token cookie (`lib/admin-token.ts`)
  - request to `/admin` hits `middleware.ts` protected-path check
  - admin APIs (e.g. `/api/admin/model`) also require `requireAdminSession`

---

## Where to make changes (routing rules)

- Order creation / integrity: `lib/order/mutations.ts` (status constants: `lib/order/orderStatus.ts`)
- API auth or ownership policy: `lib/server/route-auth.ts` first, then apply in `app/api/**/route.ts`
- Admin gate behavior: `middleware.ts` (`isProtectedPath`) + `app/api/verify-password/route.ts`
- Push fanout: `lib/notification.ts` + route handlers under `app/api/push*`
- Payment verification logic: `app/api/get-payment-info/route.ts`
- Request validation: inside the specific `app/api/.../route.ts` before domain calls

---

## Non-Negotiable Guardrails (Security + Integrity)

- Do not expose operational routes without auth.
  - Admin-only routes: `app/api/admin/model`, `app/api/agent-playground/run`, `app/api/rag/*`
  - Use `requireAdminSession` from `lib/server/route-auth.ts`
- Do not modify push routes without ownership checks.
  - Customer routes must use `requireCustomerOrderAccess`
  - Pharmacy/rider routes must use `requirePharmSession` / `requireRiderSession`
- Never store admin plaintext password in cookies.
  - Keep the flow aligned across:
    - `app/api/verify-password/route.ts`
    - `lib/admin-token.ts`
    - `middleware.ts`
- Keep stock decrement inside order transaction only.
  - `lib/order/mutations.ts` remains source of truth for stock mutation
  - Do not re-introduce client-side stock decrement after order creation
- Keep Prisma singleton pattern in `lib/db.ts`

---

## Recommended Work Order (for changes)

0. (R&D only) load minimal docs per R&D rules above
1. Scope impact first with `rg`
2. Check auth/access paths first (`route-auth`, `middleware`, session usage)
3. Apply change with explicit input validation + type safety
4. Validate: `npm run lint` → `npm run build`
5. If touching orders/push/auth:
   - manual flow check: login → checkout complete → order 조회 → push subscribe/status

---

## Priority Areas (Performance & Stability)

- P1: auth/access regressions and operational endpoint exposure
- P2: order integrity (duplicate order, stock underflow, partial failures)
- P3: runtime stability (Prisma connection pressure, repeated network calls)
- P4: dev/build loop efficiency (avoid duplicate pre scripts)

---

## Common Commands

- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start: `npm run start`
- Prisma generate: `npm run predev` or `npx prisma generate`
- Client audit helper: `npm run audit:clients`

---

## Common Mistakes to Avoid

- Adding DB write routes in `app/api/*` without role/ownership checks
- Trusting `orderId`, `pharmacyId`, `riderId` from request body alone
- Splitting order creation and stock decrement between server and client
- Reverting admin auth to plaintext cookie equality checks
- Instantiating new `PrismaClient` per import location
- Re-introducing dev/build script duplication by manually calling pre hooks inside script bodies
