# Module03 Evaluate Adverse Event Count From Source Modules

`evaluate-adverse-event-count-from-source.ts` adapts ops-exported source rows into Module03 KPI #6 evaluation samples.

## File Roles

- `evaluate-adverse-event-count-from-source.ts`
  - Orchestration entry (`parseArgs` -> schema/row parse -> KPI eval -> output emit).
- `evaluate-adverse-event-count-from-source-types.ts`
  - Shared contracts and module/kpi identity constants.
- `evaluate-adverse-event-count-from-source-cli.ts`
  - CLI/default parsing and file/date validation helpers.
- `evaluate-adverse-event-count-from-source-schema.ts`
  - Schema-map parser and source-row to sample mapping helpers.
- `evaluate-adverse-event-count-from-source-artifacts.ts`
  - Ops evaluation output payload builder.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for JSON loading, object guards, and common CLI parsing.
  - Imported to remove repeated helper implementations.

## Edit Guide

- Change CLI/default validation in `evaluate-adverse-event-count-from-source-cli.ts`.
- Change schema-map parsing or row mapping rules in `evaluate-adverse-event-count-from-source-schema.ts`.
- Change output payload shape in `evaluate-adverse-event-count-from-source-artifacts.ts`.
- Change shared helper behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
