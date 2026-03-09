# Hyphen Fetch Route Request Context Modules

## Goal
- Keep `lib/server/hyphen/fetch-route-helpers.ts` focused on route-level readiness checks and response branching.
- Move identity hash, request hash, and base/detail payload assembly into a small request-context helper module.

## Scope
- Route readiness orchestration:
  - `lib/server/hyphen/fetch-route-helpers.ts`
- Request context builders:
  - `lib/server/hyphen/fetch-route-request-context.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-route-request-context-modules.cts`
  - npm script: `qa:nhis:fetch-route-request-context-modules`

## Responsibility
- `fetch-route-helpers.ts`
  - own blocked-target checks, link/session readiness checks, gate-cache wiring, and failure response branching
- `fetch-route-request-context.ts`
  - own `buildBasePayload`, `buildDetailPayload`, and identity/request-hash/payload assembly for fetch execution

## Edit Guide
- Change readiness checks or route-level failure branching in `fetch-route-helpers.ts`.
- Change identity hash input wiring, request hash construction inputs, or base/detail payload defaults in `fetch-route-request-context.ts`.

## Validation
1. `npm run qa:nhis:fetch-route-request-context-modules`
2. `npm run qa:nhis:resilience`
3. `npm run audit:encoding`
4. `npm run lint`
5. `npm run build`
