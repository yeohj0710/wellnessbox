# Employee Sync Snapshot Module Guide

`employee-service.ts` delegates snapshot persistence to keep the main sync flow focused on cache/fetch branching.

## File roles
- `employee-sync-snapshot.ts`
  - Converts NHIS payload to persisted snapshot envelopes.
  - Updates `b2bHealthDataSnapshot` and employee `lastSyncedAt`.
  - Persists NHIS link session artifacts (`cookieData`, `stepData`) when network fetch is used.
  - Exposes shared `asJsonValue` for log payload writes.
- `employee-service.ts`
  - Handles identity resolution, cache strategy, and fetch orchestration.
  - Calls snapshot persistence as a single operation.
