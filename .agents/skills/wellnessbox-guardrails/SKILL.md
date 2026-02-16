---
name: wellnessbox-guardrails
description: Project-specific guardrails + work order for WellnessBox (Next.js App Router + TypeScript + Prisma + Postgres + Capacitor). Use for any changes touching orders/checkout, auth/ownership, admin gate, push notifications, RAG/chat, or R&D docs.
---

# WellnessBox Guardrails (Codex)

## Source of truth modules (do not bypass)
- Order integrity: `lib/order/mutations.ts` (transaction + stock decrement + duplicate `paymentId` handling)
- Auth/ownership: `lib/server/route-auth.ts` (use `requireAdminSession`, `requireAnySession`, `requirePharmSession`, `requireRiderSession`, `requireCustomerOrderAccess`)
- Prisma singleton: `lib/db.ts` (do NOT instantiate new `PrismaClient` in feature modules)
- Admin token rules: `lib/admin-token.ts` + `middleware.ts` + `/api/verify-password`

## Non-Negotiable Guardrails
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
  - `lib/order/mutations.ts` must remain the source of truth for create-order stock mutation
  - Do not re-introduce client-side stock decrement after order creation
- Keep Prisma singleton pattern in `lib/db.ts`

## R&D Docs (TIPS Extension) — Read Rules
- Doc layers:
  - `docs/rnd/*` = REQUIREMENTS / objective spec (must satisfy; includes KPI/eval)
  - `docs/rnd_impl/*` = IMPLEMENTATION NOTES / optional (use only if needed)
- Priority / conflict resolution:
  1) This skill's guardrails
  2) `docs/rnd/*`
  3) `docs/rnd_impl/*`
- Context-minimizing (token budget):
  - Always read: `AGENTS.md`, `docs/rnd/01_kpi_and_evaluation.md`
  - Read exactly ONE module spec: `docs/rnd/02~07_*.md`
  - Optional: matching `docs/rnd_impl/02~07_*_impl_notes.md`

## Recommended Work Order (changes)
1) Scope impact first with `rg`
2) Check auth/access paths first (`route-auth`, `middleware`, session usage)
3) Apply change with explicit input validation + type safety
4) Run: `npm run lint` -> `npm run build` (fix everything)
5) For order/push/auth changes: manual flow check (login, checkout complete, push subscribe/status)
