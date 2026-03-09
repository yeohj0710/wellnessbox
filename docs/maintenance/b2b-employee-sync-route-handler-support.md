# B2B Employee Sync Route Handler Support

## Goal
- Keep `lib/b2b/employee-sync-route-handler.ts` focused on auth, dedupe orchestration, and sync flow wiring.
- Move request schema, dedup-key normalization, validation error responses, and route-level DB failure mapping into a support module.

## Scope
- Route handler orchestration:
  - `lib/b2b/employee-sync-route-handler.ts`
- Shared handler support:
  - `lib/b2b/employee-sync-route-handler-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-route-handler-support.cts`
  - npm script: `qa:b2b:employee-sync-route-handler-support`

## Responsibility
- `employee-sync-route-handler.ts`
  - own authenticated POST entry flow
  - keep in-flight dedupe callsite and sync flow invocation
  - keep explicit `generateAiEvaluation === true` wiring
- `employee-sync-route-handler-support.ts`
  - own request schema and payload type
  - own dedup-key normalization
  - own validation error response mapping
  - own handler-level failure response mapping
  - reuse shared DB busy / error description helpers from `employee-sync-route-failure-support.ts`

## Edit Guide
- Change input field validation or dedup key shape in `employee-sync-route-handler-support.ts`.
- Change sync orchestration order in `employee-sync-route-handler.ts`.
- Change downstream sync success / timeout fallback behavior in `employee-sync-route.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-route-handler-support`
2. `npm run qa:b2b:sync-db-resilience`
3. `npm run qa:b2b:employee-sync-guard`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
