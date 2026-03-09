# B2B Employee Sync Summary Medication Normalizer

## Goal
- Keep `lib/b2b/employee-sync-summary.normalizer.ts` focused on summary patch need detection and normalized payload merge.
- Move medication-specific row parsing and visit-merge rules into a dedicated helper module.

## Scope
- Summary patch normalizer:
  - `lib/b2b/employee-sync-summary.normalizer.ts`
- Medication-specific helper:
  - `lib/b2b/employee-sync-summary.medication-normalizer.ts`
- QA guard:
  - `scripts/qa/check-b2b-employee-sync-summary-medication-normalizer.cts`
  - npm script: `qa:b2b:employee-sync-summary-medication-normalizer`

## Responsibility
- `employee-sync-summary.normalizer.ts`
  - own missing-target detection
  - own medication backfill decision logic
  - own normalized payload merge for medication/checkup patching
- `employee-sync-summary.medication-normalizer.ts`
  - own medication name/hospital/date key resolution
  - own visit-based merge and representative row selection
  - own normalized medication/medical row extraction helpers

## Edit Guide
- Change medication row ranking, visit grouping, or per-visit preview limits in `employee-sync-summary.medication-normalizer.ts`.
- Change patch target selection or merge policy in `employee-sync-summary.normalizer.ts`.

## Validation
1. `npm run qa:b2b:employee-sync-summary-medication-normalizer`
2. `npm run qa:b2b:employee-sync-summary-raw-support`
3. `npm run qa:medication:resilience`
4. `npm run audit:encoding`
5. `npm run lint`
6. `npm run build`
