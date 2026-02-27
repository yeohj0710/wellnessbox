# Module03 Scheduler Orchestrator Modules

`orchestrate-adverse-event-evaluation-monthly.ts` is the top-level scheduler orchestrator for Module03 KPI #6.

## File Roles

- `orchestrate-adverse-event-evaluation-monthly.ts`
  - CLI entrypoint and failure-alert wrapping.
  - Delegates parsing/runtime flow to dedicated modules.
- `orchestrate-adverse-event-evaluation-monthly-cli.ts`
  - Scheduler CLI/default parsing and input/path/webhook validation helpers.
- `orchestrate-adverse-event-evaluation-monthly-runtime.ts`
  - Runtime orchestration flow (input precedence warning, env check, export/archive run, handoff write, summary print).
- `orchestrate-adverse-event-evaluation-monthly-artifacts.ts`
  - Handoff artifact/latest-pointer builders and artifact write helpers.
- `orchestrate-adverse-event-evaluation-monthly-types.ts`
  - Shared argument/flow types and module/kpi identity constants.
- `orchestrate-adverse-event-evaluation-monthly-export.ts`
  - Stable export surface for export runtime + archive reader helpers.
- `orchestrate-adverse-event-evaluation-monthly-export-runtime.ts`
  - Warehouse export command rendering/execution and export input resolution.
  - Archive runner invocation helper.
- `orchestrate-adverse-event-evaluation-monthly-archive-readers.ts`
  - Archive latest/manifest artifact readers and strict identity parsing.
- `orchestrate-adverse-event-evaluation-monthly-failure-alert.ts`
  - Failure alert payload construction, webhook delivery, and local alert artifact writing.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Common JSON I/O, argument parsing helpers, and normalization utilities shared across Module03 scripts.

## Edit Guide

- Change top-level failure-alert wrapping in `orchestrate-adverse-event-evaluation-monthly.ts`.
- Change argument/default validation in `orchestrate-adverse-event-evaluation-monthly-cli.ts`.
- Change runtime execution flow in `orchestrate-adverse-event-evaluation-monthly-runtime.ts`.
- Change handoff artifact shape in `orchestrate-adverse-event-evaluation-monthly-artifacts.ts`.
- Change export/archive interaction in:
  - `orchestrate-adverse-event-evaluation-monthly-export-runtime.ts` (export command + archive runner invocation)
  - `orchestrate-adverse-event-evaluation-monthly-archive-readers.ts` (latest/manifest parser)
- Change failure alert and webhook behavior in `orchestrate-adverse-event-evaluation-monthly-failure-alert.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
