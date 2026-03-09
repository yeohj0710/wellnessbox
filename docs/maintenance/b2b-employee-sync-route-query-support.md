# B2B Employee Sync Route Query Support

## Goal
- Keep `lib/b2b/employee-sync-route.ts` focused on sync branching and response orchestration.
- Move snapshot reuse and timeout-fallback lookup queries into a dedicated query-support module.

## Scope
- Route orchestration:
  - `lib/b2b/employee-sync-route.ts`
- Snapshot lookup support:
  - `lib/b2b/employee-sync-route-query-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-route-query-support.cts`
  - npm script: `qa:b2b:employee-sync-route-query-support`

## Responsibility
- `employee-sync-route.ts`
  - own timeout fallback branching and access-log action names
  - own snapshot-history response selection
- `employee-sync-route-query-support.ts`
  - own latest reusable NHIS snapshot lookup
  - own timeout fallback snapshot lookup

## Edit Guide
- Change snapshot reuse ordering or select shape in `employee-sync-route-query-support.ts`.
- Change timeout fallback behavior or response policy in `employee-sync-route.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-route-query-support`
2. `npm run qa:b2b:employee-sync-route-failure-support`
3. `npm run qa:b2b:employee-sync-route-response-support`
4. `npm run qa:employee-report:timeout-fallback`
5. `npm run audit:encoding`
6. `npm run lint`
7. `npm run build`
