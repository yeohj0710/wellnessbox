# Wellness Analysis Risk Highlight Modules

## Goal
- Keep `lib/wellness/analysis.ts` focused on wellness result orchestration.
- Move risk-highlight candidate typing, sorting, representative selection, identity normalization, and final highlight mapping into a small helper module.

## Scope
- Result orchestration:
  - `lib/wellness/analysis.ts`
- Highlight helper module:
  - `lib/wellness/analysis-risk-highlights.ts`
- QA guard:
  - `scripts/qa/check-wellness-analysis-risk-highlights.cts`
  - npm script: `qa:wellness:analysis-risk-highlights`

## Responsibility
- `analysis.ts`
  - own bundle loading, answer maps, scoring calls, and final result assembly
  - keep section/domain/question candidate collection logic close to result orchestration
- `analysis-risk-highlights.ts`
  - own `RiskCandidate` contract
  - own percent clamping, candidate sorting, representative picking, identity normalization, and highlight projection

## Edit Guide
- Change risk highlight ranking or dedupe identity rules in `analysis-risk-highlights.ts`.
- Change which candidates are collected or how many highlights are selected in `analysis.ts`.

## Validation
1. `npm run qa:wellness:analysis-risk-highlights`
2. `npm run qa:b2b:wellness-scoring`
3. `npm run audit:encoding`
4. `npm run lint`
5. `npm run build`
