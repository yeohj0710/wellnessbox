# Hyphen Fetch Route Cache Support Modules

## Goal
- Keep `lib/server/hyphen/fetch-route-cache.ts` focused on memory/DB cache serving, cache hit side effects, and route-level persistence flow.
- Move reusable payload parsing, successful cache link patching, session artifact extraction, and cached response body assembly into a small support module.

## Scope
- Route cache orchestration:
  - `lib/server/hyphen/fetch-route-cache.ts`
- Shared payload/session parsing:
  - `lib/server/hyphen/fetch-route-cache-support.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-route-cache-support-modules.cts`
  - npm script: `qa:nhis:fetch-route-cache-support-modules`

## Responsibility
- `fetch-route-cache.ts`
  - own memory cache check, DB fallback selection, cache hit updates, and persisted response flow
  - re-export `isServeableNhisCachedPayload` for stable callers and resilience QA
- `fetch-route-cache-support.ts`
  - own generic payload parsing, successful cache link patching, and nested session artifact discovery
  - own cached response body assembly shared by memory and DB cache paths
  - keep `cookieData` and `stepData` extraction rules away from route-level response code

## Edit Guide
- Change cache serving priority or DB fallback rules in `fetch-route-cache.ts`.
- Change cached response body shape, nested raw payload traversal, or session artifact discovery rules in `fetch-route-cache-support.ts`.

## Validation
1. `npm run qa:nhis:fetch-route-cache-support-modules`
2. `npm run qa:nhis:resilience`
3. `npm run audit:encoding`
4. `npm run lint`
5. `npm run build`
