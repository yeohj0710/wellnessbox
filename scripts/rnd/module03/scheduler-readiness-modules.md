# Module03 Scheduler Readiness Modules

Shared modules for Module03 KPI #6 production-readiness validation.

## File Roles

- `scheduler-readiness-artifacts.ts`
  - Stable export surface for readiness artifact types and parser helpers.
- `scheduler-readiness-artifacts.types.ts`
  - Readiness artifact contracts/constants (`MODULE03_MODULE_ID`, `MODULE03_KPI06_ID`).
- `scheduler-readiness-artifacts.parsers.ts`
  - Stable export surface for readiness parser/path helper modules.
- `scheduler-readiness-parse-common.ts`
  - Shared readiness parser helpers (section guard, env-key array parser, secret-binding parser).
- `scheduler-readiness-parse-handoff.ts`
  - Handoff summary parser helpers and identity/section validation.
- `scheduler-readiness-parse-infra.ts`
  - Infra-binding parser helpers and identity/section validation.
- `scheduler-readiness-checks.ts`
  - Public entrypoint that composes readiness check groups and returns final check list.
- `scheduler-readiness-checks.types.ts`
  - Shared readiness-check contracts/options/context types.
- `scheduler-readiness-checks.shared.ts`
  - Shared check helper utilities and context builder.
- `scheduler-readiness-checks.execution.ts`
  - Execution/input/environment check-group rules.
- `scheduler-readiness-checks.integrity.ts`
  - Required-env coverage, secret-ref integrity, and scheduler template checks.

## Edit Guide

- Update readiness artifact contracts/constants in `scheduler-readiness-artifacts.types.ts`.
- Update handoff parser behavior in `scheduler-readiness-parse-handoff.ts`.
- Update infra parser behavior in `scheduler-readiness-parse-infra.ts`.
- Update shared parser helper behavior in `scheduler-readiness-parse-common.ts`.
- Update artifact path resolver behavior in `scheduler-readiness-artifacts.parsers.ts`.
- Update validation policy checks by group:
  - execution/input/environment checks in `scheduler-readiness-checks.execution.ts`
  - env coverage/secret/template checks in `scheduler-readiness-checks.integrity.ts`

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
