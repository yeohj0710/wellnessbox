# B2B Employee Service Cache Reuse

## Goal
- Keep `lib/b2b/employee-service.ts` focused on employee upsert, link validation, live fetch, and upstream error mapping.
- Move valid-cache/history replay into a dedicated helper module.

## Scope
- Service entry:
  - `lib/b2b/employee-service.ts`
- Cache replay helper:
  - `lib/b2b/employee-service-cache-reuse.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-service-cache-reuse.cts`
  - npm script: `qa:b2b:employee-service-cache-reuse`

## Responsibility
- `employee-service.ts`
  - own link readiness checks
  - own force-refresh cache clearing
  - own live NHIS fetch execution
  - own timeout/auth/upstream error mapping
- `employee-service-cache-reuse.ts`
  - own valid-cache replay
  - own history-cache replay
  - own summary patch + persisted snapshot reuse flow

## Edit Guide
- Change cache/history replay order or replay persistence rules in `employee-service-cache-reuse.ts`.
- Change live fetch, timeout mapping, or sync orchestration in `employee-service.ts`.

## Validation
1. `npm run qa:b2b:employee-service-cache-reuse`
2. `npm run qa:b2b:sync-db-resilience`
3. `npm run qa:b2b:employee-sync-guard`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
