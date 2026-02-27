# Module03 Scheduler Handoff Validation Modules

`run-scheduler-handoff-validation.ts` is the one-command runner for Module03 KPI #6 scheduler handoff validation.

## File Roles

- `run-scheduler-handoff-validation.ts`
  - Handoff validation orchestration entry and summary emit flow.
- `scheduler-handoff-validation-cli.ts`
  - Handoff CLI/default parser + validation helpers.
- `scheduler-handoff-validation-runtime.ts`
  - Stable export surface for runtime input/exec helper modules.
- `scheduler-handoff-validation-runtime-types.ts`
  - Runtime constants/contracts (`MODULE_ID`, `KPI_ID`, `ValidationPaths`, `ValidationInputResolution`).
- `scheduler-handoff-validation-runtime-input.ts`
  - Input resolution and representative source-row generation helpers.
- `scheduler-handoff-validation-runtime-exec.ts`
  - Stable export surface for runtime env/runner helper modules.
- `scheduler-handoff-validation-runtime-exec-env.ts`
  - Secret-binding and runtime env value/override composition helpers.
- `scheduler-handoff-validation-runtime-exec-runners.ts`
  - Deployment/infra/dry-run runner invocation and output verification helpers.
- `scheduler-handoff-validation-artifacts.ts`
  - Stable export surface for parser/summary helper modules.
- `scheduler-handoff-validation-parsers.ts`
  - Stable export surface for deployment/dry-run parser modules.
- `scheduler-handoff-validation-parse-deployment.ts`
  - Deployment bundle parser and identity/section validation helpers.
- `scheduler-handoff-validation-parse-dry-run.ts`
  - Dry-run report parser and verification/output section validation helpers.
- `node-script-runner.ts`
  - Shared runner existence checks and child-process execution wrapper for Node script invocations.
  - Used to keep command failure formatting consistent across Module03 orchestration scripts.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Reusable utilities for JSON I/O, path formatting, and common CLI validation.
  - Imported by `run-scheduler-handoff-validation.ts` to reduce duplicate utility code.

## Edit Guide

- Change handoff validation orchestration flow in `run-scheduler-handoff-validation.ts`.
- Change input generation/resolution policy in `scheduler-handoff-validation-runtime-input.ts`.
- Change runtime env/secret-binding policy in `scheduler-handoff-validation-runtime-exec-env.ts`.
- Change runner invocation/verification policy in `scheduler-handoff-validation-runtime-exec-runners.ts`.
- Change deployment parser policy in `scheduler-handoff-validation-parse-deployment.ts`.
- Change dry-run parser policy in `scheduler-handoff-validation-parse-dry-run.ts`.
- Change parser/summary export wiring in handoff artifacts modules.
- Change child-process execution behavior in `node-script-runner.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
