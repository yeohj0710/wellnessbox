# B2B Employee Service Log Modules

`lib/b2b/employee-service.ts` now keeps sync orchestration and employee upsert focused. Log write concerns live in a dedicated module while the public import path stays stable through re-export.

## File roles

- `lib/b2b/employee-service.ts`
  - Public facade for employee sync service exports.
  - Owns `B2bEmployeeSyncError`, timeout classification, employee upsert, and live `fetchAndStoreB2bHealthSnapshot` orchestration.
  - Delegates valid-cache/history replay to `lib/b2b/employee-service-cache-reuse.ts`.
  - Re-exports `logB2bEmployeeAccess` and `logB2bAdminAction`.
- `lib/b2b/employee-service-cache-reuse.ts`
  - Owns valid-cache replay and history-cache replay before live sync.
  - Owns summary patch + persisted snapshot reuse flow.
- `lib/b2b/employee-service.logs.ts`
  - Owns employee/admin log dedupe queries.
  - Owns IP hashing, best-effort log writes, and throttle-memory integration.
  - Keeps log payload persistence logic separate from NHIS sync orchestration.

## Change guide

- Sync cache/fetch/error flow changes:
  - `lib/b2b/employee-service.ts`
- Valid-cache/history replay flow changes:
  - `lib/b2b/employee-service-cache-reuse.ts`
- Log dedupe rules or log payload write behavior changes:
  - `lib/b2b/employee-service.logs.ts`
- Shared JSON payload persistence shape for logs:
  - `lib/b2b/employee-sync-snapshot.ts`

## Validation

- `npm run qa:b2b:employee-service-cache-reuse`
- `npm run qa:b2b:log-throttle`
- `npm run qa:b2b:sync-db-resilience`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
