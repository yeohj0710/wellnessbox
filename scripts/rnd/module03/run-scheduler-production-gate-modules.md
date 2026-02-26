# Module03 Scheduler Production Gate Modules

`run-scheduler-production-gate.ts` is the top-level gate runner for Module03 KPI #6.

## File Roles

- `run-scheduler-production-gate.ts`
  - Runs handoff validation and readiness validation in sequence.
  - Produces a final production-gate artifact with pass/fail status and command traces.
- `node-script-runner.ts`
  - Shared runner existence checks and child-process execution wrapper for Node script invocations.
  - Used to keep command failure formatting and execution metadata consistent.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for CLI parsing helpers, JSON I/O, and workspace path rendering.
  - Imported to reduce duplicate utility implementations.

## Edit Guide

- Change gate orchestration logic or gate artifact schema in `run-scheduler-production-gate.ts`.
- Change child-process execution behavior in `node-script-runner.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
