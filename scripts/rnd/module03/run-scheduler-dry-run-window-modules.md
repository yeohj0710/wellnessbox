# Module03 Scheduler Dry Run Window Modules

`run-scheduler-dry-run-window.ts` executes Module03 KPI #6 scheduler dry-runs from infra-binding artifacts.

## File Roles

- `run-scheduler-dry-run-window.ts`
  - Parses infra-binding artifact and input export.
  - Builds scheduler args, runs dry-run, and writes a dry-run verification report.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for common CLI value parsing, JSON I/O, and path formatting.
  - Imported to keep dry-run script focused on domain-specific behavior.

## Edit Guide

- Change dry-run execution flow or report schema in `run-scheduler-dry-run-window.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
