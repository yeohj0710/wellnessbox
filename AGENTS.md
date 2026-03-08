# AGENTS.md - WellnessBox Service Boundary

## Scope

- `wellnessbox` is the production web service repository.
- Keep only runtime-owned web service code, service operations code, and service maintenance docs here.
- Do not add new R&D documents, evaluation artifacts, agent design notes, prompt SSOT, or experiment records here.

## R&D Source Of Truth

- The only primary R&D context document is `C:/dev/wellnessbox-rnd/docs/context/master_context.md`.
- New R&D design, planning, evaluation, prompt, and experiment documents must be written only in `wellnessbox-rnd`.
- If the web service needs R&D outputs later, connect through thin interfaces such as API contracts, generated schema, or snapshot artifacts. Do not duplicate the original source here.

## Runtime Guardrails

- Auth and ownership checks must use `lib/server/route-auth.ts`.
- Order stock mutation must remain inside `lib/order/mutations.ts:createOrder`.
- Prisma client must remain singleton via `lib/db.ts`.
- Keep `app/api/verify-password/route.ts`, `lib/admin-token.ts`, and `middleware.ts` aligned.
- Keep user-facing copy Korean-first unless a task explicitly requires another language.
- Keep text files UTF-8 and LF. Run `npm run audit:encoding` before finalizing text-heavy changes.

## Service-Owned Areas

- App routes and UI under `app/`, `components/`, `public/`
- Service domain logic under `lib/` except R&D-owned candidates documented in `wellnessbox-rnd/docs/00_migration/11_thin_interface_candidates.md`
- Runtime data and templates still used directly by the service
- Service QA, admin, order, auth, payment, NHIS, survey, result, and reporting flows

## Do Not Reintroduce

- `docs/rnd/**`, `docs/rnd_impl/**` style R&D documents
- root-level agent reports and generated artifacts
- `scripts/agent/**` style agent tooling
- ad-hoc experiment notes or duplicated plan/context files

## Validation

1. `npm run audit:encoding`
2. `npm run lint`
3. `npm run build`
