# B2B Export Pipeline Support Modules

## Goal
- Keep `lib/b2b/export/pipeline.ts` focused on layout validation stages, export orchestration, and override handling.
- Move reusable clone, text-shortening, style-preset resolution, and PPTX filename rules into a small helper module.

## Scope
- Entry orchestration:
  - `lib/b2b/export/pipeline.ts`
- Shared support helpers:
  - `lib/b2b/export/pipeline-support.ts`
- QA guard:
  - `scripts/qa/check-b2b-export-pipeline-support-modules.cts`
  - npm script: `qa:b2b:export-pipeline-support-modules`

## Responsibility
- `pipeline.ts`
  - own validation attempts, fallback stage ordering, non-blocking promotion rules, and final export assembly
  - keep layout override acceptance and PPTX render flow at the entry layer
- `pipeline-support.ts`
  - own payload cloning and pharmacist text shortening
  - own style-preset candidate ordering
  - own PPTX filename normalization and date suffix rules

## Edit Guide
- Change validation stage flow or export override handling in `pipeline.ts`.
- Change payload shortening thresholds, preset ordering, or filename formatting in `pipeline-support.ts`.

## Validation
1. `npm run qa:b2b:export-pipeline-support-modules`
2. `npm run audit:encoding`
3. `npm run lint`
4. `npm run build`
