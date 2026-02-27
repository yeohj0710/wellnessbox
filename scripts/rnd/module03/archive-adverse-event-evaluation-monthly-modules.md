# Module03 Archive Monthly Evaluation Modules

`archive-adverse-event-evaluation-monthly.ts` runs Module03 KPI #6 monthly evaluation archiving from exported source rows.

## File Roles

- `archive-adverse-event-evaluation-monthly.ts`
  - Archive runner orchestration (`args parse -> ops run -> artifact assembly -> manifest/latest write -> log`).
- `archive-adverse-event-evaluation-monthly-types.ts`
  - Shared archive runner contracts/constants (`CliArgs`, default archive dir, ops runner path).
- `archive-adverse-event-evaluation-monthly-cli.ts`
  - CLI/default parser and argument/path validation (`--input`, `--schema-map`, `--archive-dir`, `--window-end`, `--retention-months`).
- `archive-adverse-event-evaluation-monthly-runtime.ts`
  - Ops runner execution helpers and archive result logging policy.
- `monthly-archive-artifacts.ts`
  - Stable export surface for monthly archive parser/build helper modules.
- `monthly-archive-parsers.ts`
  - Ops output and archive manifest parser helpers with strict identity/field checks.
- `monthly-archive-builders.ts`
  - Archive path/entry/manifest/latest builder and writer helpers.
- `monthly-archive-retention.ts`
  - Retention cutoff/partition/prune/upsert policy helpers.
- `monthly-archive-types.ts`
  - Archive contracts/constants (`MODULE_ID`, `KPI_ID`, `MANIFEST_FILE_NAME`).
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utilities for validation, JSON I/O, and path formatting.
  - Imported to remove repeated helper code.

## Edit Guide

- Change CLI/default parser policy in `archive-adverse-event-evaluation-monthly-cli.ts`.
- Change ops runner invocation or archive log policy in `archive-adverse-event-evaluation-monthly-runtime.ts`.
- Change high-level orchestration wiring in `archive-adverse-event-evaluation-monthly.ts`.
- Change ops/manifest parser behavior in `monthly-archive-parsers.ts`.
- Change archive output builders in `monthly-archive-builders.ts`.
- Change retention policy behavior in `monthly-archive-retention.ts`.
- Change common utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
