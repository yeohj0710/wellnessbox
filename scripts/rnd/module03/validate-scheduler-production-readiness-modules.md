# Module03 Scheduler Production Readiness Modules

`validate-scheduler-production-readiness.ts` evaluates whether Module03 KPI #6 scheduler artifacts are ready for production operation.

## File Roles

- `validate-scheduler-production-readiness.ts`
  - Parses CLI arguments and orchestrates readiness validation output generation.
  - Builds PASS/FAIL report artifact from parsed inputs and check results.
- `scheduler-readiness-artifacts.ts`
  - Shared schema/type definitions for handoff and infra-binding artifacts.
  - Artifact parsing and path resolution utilities used by readiness validation.
- `scheduler-readiness-checks.ts`
  - Encapsulates readiness check rules and detail message construction.
  - Handles environment, input-source, and secret-binding consistency checks.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for JSON I/O and workspace path formatting.
  - Imported to avoid duplicate helper implementations.

## Edit Guide

- Change top-level CLI/report wiring in `validate-scheduler-production-readiness.ts`.
- Change artifact schema parsing in `scheduler-readiness-artifacts.ts`.
- Change readiness rule definitions in `scheduler-readiness-checks.ts`.
- Change shared utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
