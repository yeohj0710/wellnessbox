# B2B Employee Sync Route Response Support

## Goal
- Keep `lib/b2b/employee-sync-route.ts` focused on sync orchestration, timeout fallback branching, and access logging.
- Move repeated success-response and blocked-error response assembly into a shared support module.

## Scope
- Route orchestration:
  - `lib/b2b/employee-sync-route.ts`
- Shared response assembly:
  - `lib/b2b/employee-sync-route-response-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-route-response-support.cts`
  - npm script: `qa:b2b:employee-sync-route-response-support`

## Responsibility
- `employee-sync-route.ts`
  - own snapshot reuse policy
  - own `hyphen_fetch_timeout` fallback branch
  - own access-log action names and DB error mapping
- `employee-sync-route-response-support.ts`
  - own success cooldown projection for sync responses
  - own repeated `buildSyncSuccessResponse` assembly
  - own blocked `B2bEmployeeSyncError` response payload assembly

## Edit Guide
- Change success cooldown payload shape or token attachment wiring in `employee-sync-route-response-support.ts`.
- Change timeout fallback decision rules or sync access-log actions in `employee-sync-route.ts`.
- Change top-level sync POST parsing/dedupe/auth flow in `employee-sync-route-handler.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-route-response-support`
2. `npm run qa:b2b:sync-db-resilience`
3. `npm run qa:employee-report:timeout-fallback`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
