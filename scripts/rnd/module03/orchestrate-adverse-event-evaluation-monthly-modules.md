# Module03 Scheduler Orchestrator Modules

`orchestrate-adverse-event-evaluation-monthly.ts` is the top-level scheduler orchestrator for Module03 KPI #6.

## File Roles

- `orchestrate-adverse-event-evaluation-monthly.ts`
  - CLI entrypoint and top-level orchestration flow.
  - Coordinates export resolution, archive evaluation, and handoff artifact creation.
- `orchestrate-adverse-event-evaluation-monthly-types.ts`
  - Shared argument and flow types used by orchestrator submodules.
- `orchestrate-adverse-event-evaluation-monthly-export.ts`
  - Warehouse export resolution and execution.
  - Archive runner invocation and archive artifact parsing.
- `orchestrate-adverse-event-evaluation-monthly-failure-alert.ts`
  - Failure alert payload construction, webhook delivery, and local alert artifact writing.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Common JSON I/O, argument parsing helpers, and normalization utilities shared across Module03 scripts.

## Edit Guide

- Change top-level scheduler flow or handoff artifact shape in `orchestrate-adverse-event-evaluation-monthly.ts`.
- Change export/archive interaction in `orchestrate-adverse-event-evaluation-monthly-export.ts`.
- Change failure alert and webhook behavior in `orchestrate-adverse-event-evaluation-monthly-failure-alert.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
