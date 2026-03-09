# Hyphen Fetch Route Persist Support Modules

## Goal
- Keep `lib/server/hyphen/fetch-route-persist.ts` focused on execute-and-persist orchestration.
- Move reusable AI-summary, failed-code normalization, status mapping, and attempt-log wrappers into a small support module.

## Scope
- Persist orchestration:
  - `lib/server/hyphen/fetch-route-persist.ts`
- Shared persist helper:
  - `lib/server/hyphen/fetch-route-persist-support.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-route-persist-support.cts`
  - npm script: `qa:nhis:fetch-route-persist-support-modules`

## Responsibility
- `fetch-route-persist.ts`
  - own dedupe wrapper
  - own execute fetch -> persist success/failure orchestration
  - own top-level catch path for failed attempt logging
- `fetch-route-persist-support.ts`
  - own non-fatal AI-summary wrapper
  - own failed-code normalization and failed-status mapping
  - own best-effort attempt log wrapper

## Edit Guide
- Change execute/persist flow order in `fetch-route-persist.ts`.
- Change failed-code/status policy, AI-summary fallback, or attempt-log safety rules in `fetch-route-persist-support.ts`.

## Validation
1. `npm run qa:nhis:fetch-route-persist-support-modules`
2. `npm run qa:nhis:fetch-route-readiness-support-modules`
3. `npm run qa:nhis:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
