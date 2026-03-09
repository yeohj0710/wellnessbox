# Hyphen Fetch Cache Support Modules

## Goal
- Keep `lib/server/hyphen/fetch-cache.ts` focused on Prisma cache lookup, cache persistence, and dedup orchestration.
- Move reusable hash, TTL, target normalization, and JSON serialization rules into a small support module.

## Scope
- Cache entry orchestration:
  - `lib/server/hyphen/fetch-cache.ts`
- Shared helper rules:
  - `lib/server/hyphen/fetch-cache-support.ts`
- Query helper rules:
  - `lib/server/hyphen/fetch-cache-query-support.ts`
- QA guard:
  - `scripts/qa/check-hyphen-fetch-cache-support-modules.cts`
  - npm script: `qa:nhis:fetch-cache-support-modules`

## Responsibility
- `fetch-cache.ts`
  - own Prisma cache queries, cache upsert, cache hit tracking, and dedup wrapper
  - re-export stable public hash helpers for existing callers
- `fetch-cache-support.ts`
  - own identity hash derivation, request hash construction, target normalization, cache TTL policy, and JSON-safe payload serialization
- `fetch-cache-query-support.ts`
  - own reusable Prisma `where` builders for identity-scoped cache lookups
  - keep normalized target/query mode rules out of the cache entry module

## Edit Guide
- Change cache persistence flow or dedup wrapper in `fetch-cache.ts`.
- Change hash salt policy, TTL rules, or target normalization in `fetch-cache-support.ts`.
- Change identity cache lookup shape in `fetch-cache-query-support.ts`.

## Validation
1. `npm run qa:nhis:fetch-cache-support-modules`
2. `npm run audit:encoding`
3. `npm run lint`
4. `npm run build`
