# Module03 Scheduler Production Readiness Modules

`validate-scheduler-production-readiness.ts` evaluates whether Module03 KPI #6 scheduler artifacts are ready for production operation.

## File Roles

- `validate-scheduler-production-readiness.ts`
  - Readiness validator orchestration entry (`args -> source load -> check compute -> report write -> exit policy`).
- `validate-scheduler-production-readiness-types.ts`
  - Shared validator contracts/constants for CLI/source/computation/report wiring.
- `validate-scheduler-production-readiness-cli.ts`
  - CLI/default parser and summary-path/output-path/environment flag validation.
- `validate-scheduler-production-readiness-runtime.ts`
  - Source loader and readiness-check computation helpers.
- `validate-scheduler-production-readiness-artifacts.ts`
  - PASS/FAIL readiness report builder and exit-message/exit-code policy.
- `scheduler-readiness-artifacts.ts`
  - Stable export surface for readiness artifact parser/type modules.
- `scheduler-readiness-artifacts.parsers.ts`
  - Stable export surface for readiness parser/path helper modules.
- `scheduler-readiness-parse-common.ts`
  - Shared readiness parser helpers (section guard, env-key array parser, secret-binding parser).
- `scheduler-readiness-parse-handoff.ts`
  - Handoff summary parser helpers and identity/section validation.
- `scheduler-readiness-parse-infra.ts`
  - Infra-binding parser helpers and identity/section validation.
- `scheduler-readiness-checks.ts`
  - Readiness check orchestration entry and check-group composition.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for JSON I/O and workspace path formatting.
  - Imported to avoid duplicate helper implementations.

## Edit Guide

- Change CLI/default policy in `validate-scheduler-production-readiness-cli.ts`.
- Change source-load/check-computation flow in `validate-scheduler-production-readiness-runtime.ts`.
- Change report shape or exit behavior in `validate-scheduler-production-readiness-artifacts.ts`.
- Change readiness handoff parser behavior in `scheduler-readiness-parse-handoff.ts`.
- Change readiness infra parser behavior in `scheduler-readiness-parse-infra.ts`.
- Change readiness parser helper behavior in `scheduler-readiness-parse-common.ts`.
- Change readiness artifact path resolver behavior in `scheduler-readiness-artifacts.parsers.ts`.
- Change readiness rule definitions in readiness-check modules.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
