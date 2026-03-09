# Employee Sync Module Guide

This document maps the service-owned modules around
`fetchAndStoreB2bHealthSnapshot`.

## Module Map

- `lib/b2b/employee-service.ts`
  - Public facade for B2B employee sync flows
  - Owns employee upsert, NHIS sync orchestration, and timeout/error branches
- `lib/b2b/employee-service-cache-reuse.ts`
  - Owns valid-cache and history-cache replay before live sync
  - Owns summary patch + persisted snapshot reuse flow
- `lib/b2b/employee-service.logs.ts`
  - Owns employee/admin log dedupe queries and best-effort DB writes
  - Includes `logB2bEmployeeAccess` and `logB2bAdminAction`
- `lib/b2b/employee-sync-summary.ts`
  - Owns summary payload patch orchestration
  - Reuses cache snapshots, runs patch fetches, and assembles the final payload
  - Includes `parseCachedPayload` and `patchSummaryTargetsIfNeeded`
- `lib/b2b/employee-sync-summary.fetch-patch.ts`
  - Owns cache lookup and network fetch reuse for summary patch requests
  - Reuses raw target coverage checks from `employee-sync-summary.raw-support.ts`
- `lib/b2b/employee-sync-summary.fetch-patch-cache.ts`
  - Owns valid cache lookup and history/global fallback order
  - Owns reusable cached payload usability checks
- `lib/b2b/employee-sync-summary.raw-support.ts`
  - Owns raw target key mapping
  - Owns raw target presence checks
  - Owns target-scoped raw payload merge rules
  - Owns requested raw target coverage checks
- `lib/b2b/employee-sync-summary.normalizer.ts`
  - Owns summary patch need detection
  - Owns normalized payload merge rules
- `lib/b2b/employee-sync-summary.medication-normalizer.ts`
  - Owns medication row parsing and visit-based merge rules
  - Owns medication backfill row quality rules
- `lib/b2b/employee-sync-link-artifacts.ts`
  - Extracts `cookieData` and `stepData` artifacts from Hyphen responses
  - Owns values needed to recover NHIS link sessions
- `lib/b2b/employee-sync-snapshot.ts`
  - Writes the final payload into the snapshot envelope
  - Owns `lastSyncedAt` updates and link artifact persistence

## Edit Guide

- Change summary patch orchestration or forced target selection:
  - `employee-sync-summary.ts`
- Change raw target merge rules:
  - `employee-sync-summary.raw-support.ts`
- Change cache reuse or network patch fetch selection:
  - `employee-sync-summary.fetch-patch.ts`
- Change reusable cache validation or history/global fallback order:
  - `employee-sync-summary.fetch-patch-cache.ts`
- Change medication row merge or backfill rules:
  - `employee-sync-summary.medication-normalizer.ts`
- Change normalized payload merge or patch-need rules:
  - `employee-sync-summary.normalizer.ts`
- Change link artifact extraction rules:
  - `employee-sync-link-artifacts.ts`
- Change sync orchestration, cache reuse, or error branches:
  - `employee-service.ts`
- Change valid-cache or history-cache replay rules:
  - `employee-service-cache-reuse.ts`
- Change employee/admin log dedupe or best-effort writes:
  - `employee-service.logs.ts`

## Validation

- `npm run qa:b2b:employee-sync-summary-raw-support`
- `npm run qa:b2b:employee-sync-summary-fetch-patch-cache`
- `npm run qa:b2b:employee-sync-summary-medication-normalizer`
- `npm run qa:b2b:employee-service-cache-reuse`
- `npm run qa:b2b:log-throttle`
- `npm run qa:b2b:sync-db-resilience`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
