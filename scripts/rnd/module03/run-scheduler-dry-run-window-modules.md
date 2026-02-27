# Module03 Scheduler Dry Run Window Modules

`run-scheduler-dry-run-window.ts` executes Module03 KPI #6 scheduler dry-runs from infra-binding artifacts.

## File Roles

- `run-scheduler-dry-run-window.ts`
  - Dry-run orchestration entry (`args parse -> infra parse -> arg plan -> dry-run -> report emit`).
- `scheduler-dry-run-artifacts.ts`
  - Stable export surface for dry-run infra/parser/plan helpers.
- `scheduler-dry-run-types.ts`
  - Dry-run CLI/infra/report contracts and module/kpi constants.
- `scheduler-dry-run-infra.ts`
  - Stable export surface for dry-run infra CLI/parser modules.
- `scheduler-dry-run-infra-cli.ts`
  - CLI/default parser and input path/window flag validation.
- `scheduler-dry-run-infra-parser.ts`
  - Infra-binding artifact parser and artifact path resolver helpers.
- `scheduler-dry-run-plan.ts`
  - Stable export surface for scheduler arg/output helper modules.
- `scheduler-dry-run-plan-args.ts`
  - Scheduler argument composition helpers (artifact paths, retention/env/failure-webhook flags).
- `scheduler-dry-run-plan-output.ts`
  - Expected output verification and default dry-run report out-path builder.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for common CLI value parsing, JSON I/O, and path formatting.
  - Imported to keep dry-run script focused on domain-specific behavior.

## Edit Guide

- Change dry-run orchestration/report schema in `run-scheduler-dry-run-window.ts`.
- Change CLI/default policy in `scheduler-dry-run-infra-cli.ts`.
- Change infra artifact parser/path policy in `scheduler-dry-run-infra-parser.ts`.
- Change scheduler arg-composition policy in `scheduler-dry-run-plan-args.ts`.
- Change output verification/default out-path policy in `scheduler-dry-run-plan-output.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
