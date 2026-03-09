# Hyphen Fetch Route Readiness Support Modules

## Goal
- Keep `lib/server/hyphen/fetch-route-helpers.ts` focused on readiness flow orchestration.
- Move blocked-target, init-required, expired-session, and failed-response payload assembly into a small support module.

## Scope
- Route readiness orchestration:
  - `lib/server/hyphen/fetch-route-helpers.ts`
- Readiness response support:
  - `lib/server/hyphen/fetch-route-readiness-support.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-route-readiness-support.cts`
  - npm script: `qa:nhis:fetch-route-readiness-support-modules`

## Responsibility
- `fetch-route-helpers.ts`
  - own blocked-target checks
  - own link/session/gate-cache/budget readiness flow
  - own final ready/not-ready branching
- `fetch-route-readiness-support.ts`
  - own blocked-target response body
  - own init-required and missing-cookie session responses
  - own failed NHIS payload auth-expired remapping

## Edit Guide
- Change readiness branch order or gate checks in `fetch-route-helpers.ts`.
- Change readiness failure payloads or failed-fetch remapping in `fetch-route-readiness-support.ts`.

## Validation
1. `npm run qa:nhis:fetch-route-readiness-support-modules`
2. `npm run qa:nhis:fetch-route-request-context-modules`
3. `npm run qa:nhis:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
