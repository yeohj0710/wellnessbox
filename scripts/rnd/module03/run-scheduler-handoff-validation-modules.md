# Module03 Scheduler Handoff Validation Modules

`run-scheduler-handoff-validation.ts` is the one-command runner for Module03 KPI #6 scheduler handoff validation.

## File Roles

- `run-scheduler-handoff-validation.ts`
  - Orchestrates bundle generation -> infra binding generation -> dry-run execution -> final validation summary output.
  - Keeps module-specific parsing and verification logic.
- `node-script-runner.ts`
  - Shared runner existence checks and child-process execution wrapper for Node script invocations.
  - Used to keep command failure formatting consistent across Module03 orchestration scripts.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Reusable utilities for JSON I/O, path formatting, and common CLI validation.
  - Imported by `run-scheduler-handoff-validation.ts` to reduce duplicate utility code.

## Edit Guide

- Change handoff validation flow or output schema in `run-scheduler-handoff-validation.ts`.
- Change child-process execution behavior in `node-script-runner.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
