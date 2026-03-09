# Hyphen Fetch Route Gate Support Modules

## Goal
- Keep `lib/server/hyphen/fetch-route-gate.ts` focused on route-level gate orchestration.
- Move force-refresh guard flow and budget-blocked response assembly into a small support module.

## Scope
- Route gate orchestration:
  - `lib/server/hyphen/fetch-route-gate.ts`
- Gate support:
  - `lib/server/hyphen/fetch-route-gate-support.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-route-gate-support.cts`
  - npm script: `qa:nhis:fetch-route-gate-support-modules`

## Responsibility
- `fetch-route-gate.ts`
  - own normal vs force-refresh route branching
  - own DB cache serve entry for non-force-refresh path
- `fetch-route-gate-support.ts`
  - own force-refresh guarded cache and cooldown response flow
  - own budget-blocked response payload assembly

## Edit Guide
- Change route branching or normal cache-serve entry in `fetch-route-gate.ts`.
- Change force-refresh guard/cooldown policy wiring or budget-blocked payload shape in `fetch-route-gate-support.ts`.

## Validation
1. `npm run qa:nhis:fetch-route-gate-support-modules`
2. `npm run qa:nhis:fetch-route-readiness-support-modules`
3. `npm run qa:nhis:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
