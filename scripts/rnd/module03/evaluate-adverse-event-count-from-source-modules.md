# Module03 Evaluate Adverse Event Count From Source Modules

`evaluate-adverse-event-count-from-source.ts` adapts ops-exported source rows into Module03 KPI #6 evaluation samples.

## File Roles

- `evaluate-adverse-event-count-from-source.ts`
  - Parses source export + schema map and maps rows to evaluation samples.
  - Runs KPI evaluation and emits JSON output.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for JSON loading, object guards, and common CLI parsing.
  - Imported to remove repeated helper implementations.

## Edit Guide

- Change source-row mapping rules or output payload shape in `evaluate-adverse-event-count-from-source.ts`.
- Change shared helper behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
