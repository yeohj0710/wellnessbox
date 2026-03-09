# B2B Employee Sync Route Failure Support

## Goal
- Keep `lib/b2b/employee-sync-route.ts` focused on sync orchestration, cooldown policy, and timeout fallback branching.
- Share DB busy response policy and execute-failure error shaping across the route and handler-support layers.

## Scope
- Route orchestration:
  - `lib/b2b/employee-sync-route.ts`
- Shared failure support:
  - `lib/b2b/employee-sync-route-failure-support.ts`
- Handler failure mapping:
  - `lib/b2b/employee-sync-route-handler-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-route-failure-support.cts`
  - npm script: `qa:b2b:employee-sync-route-failure-support`

## Responsibility
- `employee-sync-route.ts`
  - own timeout fallback decision and sync access-log action names
  - keep `execute sync failed` logging site for route-level regression guards
- `employee-sync-route-failure-support.ts`
  - own DB pool busy retry window and response payload
  - own shared sync error description helper
  - own generic execute-failure mapping to `DB_POOL_TIMEOUT` vs other route errors
- `employee-sync-route-handler-support.ts`
  - reuse shared DB busy / error description helpers
  - own handler-specific validation and top-level route error mapping

## Edit Guide
- Change DB busy retry timing or message in `employee-sync-route-failure-support.ts`.
- Change timeout fallback branching or sync access-log action names in `employee-sync-route.ts`.
- Change POST schema/dedup/validation behavior in `employee-sync-route-handler-support.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-route-failure-support`
2. `npm run qa:b2b:employee-sync-route-handler-support`
3. `npm run qa:b2b:employee-sync-route-response-support`
4. `npm run qa:b2b:sync-db-resilience`
5. `npm run qa:b2b:employee-sync-guard`
6. `npm run audit:encoding`
7. `npm run lint`
8. `npm run build`
