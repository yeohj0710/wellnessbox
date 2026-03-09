# B2B Employee Sync Summary Raw Support

## Goal
- Keep `lib/b2b/employee-sync-summary.ts` focused on summary patch orchestration.
- Move raw target key mapping and target-scoped raw payload merge rules into a dedicated helper module.

## Scope
- Summary patch entry:
  - `lib/b2b/employee-sync-summary.ts`
- Raw target helper:
  - `lib/b2b/employee-sync-summary.raw-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-summary-raw-support.cts`
  - npm script: `qa:b2b:employee-sync-summary-raw-support`

## Responsibility
- `employee-sync-summary.ts`
  - own patch target selection
  - own network patch execution
  - own final payload assembly
- `employee-sync-summary.raw-support.ts`
  - own target-to-raw-key mapping
  - own raw payload presence checks
  - own target-scoped raw payload merge rules
  - own requested-raw-target coverage checks for cache/network payload reuse

## Edit Guide
- Change raw target key names or raw merge behavior in `employee-sync-summary.raw-support.ts`.
- Change patch orchestration or target forcing logic in `employee-sync-summary.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-summary-raw-support`
2. `npm run qa:b2b:employee-sync-summary-medication-normalizer`
3. `npm run qa:medication:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
