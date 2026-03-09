# B2B Employee Sync Summary Fetch Patch Cache

## Goal
- Keep `lib/b2b/employee-sync-summary.fetch-patch.ts` focused on hash construction and network fetch orchestration.
- Move cache selection and reusable cached payload validation into a dedicated helper module.

## Scope
- Fetch patch entry:
  - `lib/b2b/employee-sync-summary.fetch-patch.ts`
- Cache selection helper:
  - `lib/b2b/employee-sync-summary.fetch-patch-cache.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-summary-fetch-patch-cache.cts`
  - npm script: `qa:b2b:employee-sync-summary-fetch-patch-cache`

## Responsibility
- `employee-sync-summary.fetch-patch.ts`
  - own request hash construction
  - own network fetch execution
  - own cache save
- `employee-sync-summary.fetch-patch-cache.ts`
  - own valid-cache lookup
  - own identity/global history fallback order
  - own reusable cached payload usability checks

## Edit Guide
- Change cache fallback order or reusable cache validation in `employee-sync-summary.fetch-patch-cache.ts`.
- Change request hash, request payload construction, or network save flow in `employee-sync-summary.fetch-patch.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-summary-fetch-patch-cache`
2. `npm run qa:b2b:employee-sync-summary-raw-support`
3. `npm run qa:medication:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
