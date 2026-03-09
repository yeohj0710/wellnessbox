# B2B Analyzer Health Metrics Modules

## Goal
- Keep `lib/b2b/analyzer-health.ts` focused on health snapshot interpretation and medication summary assembly.
- Move reusable health metric status and penalty rules into a small helper module.

## Scope
- Health/medication assembly:
  - `lib/b2b/analyzer-health.ts`
- Health metric rules:
  - `lib/b2b/analyzer-health-metrics.ts`
- QA guard:
  - `scripts/qa/check-b2b-analyzer-health-metrics.cts`
  - npm script: `qa:b2b:analyzer-health-metrics`

## Responsibility
- `analyzer-health.ts`
  - own health overview mapping, risk flag composition, medication summary, and caution text assembly
- `analyzer-health-metrics.ts`
  - own blood pressure parsing, metric status classification, and score penalty weights

## Edit Guide
- Change health overview or medication output shape in `analyzer-health.ts`.
- Change numeric threshold rules or severity penalty weights in `analyzer-health-metrics.ts`.

## Validation
1. `npm run qa:b2b:analyzer-health-metrics`
2. `npm run qa:b2b:wellness-scoring`
3. `npm run audit:encoding`
4. `npm run lint`
5. `npm run build`
