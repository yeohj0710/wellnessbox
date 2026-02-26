# Module03 Scheduler Infra Binding Modules

`generate-scheduler-infra-binding.ts` generates infra-binding artifacts for Module03 KPI #6 scheduler deployment.

## File Roles

- `generate-scheduler-infra-binding.ts`
  - Loads deployment bundle + secret bindings and builds final infra-binding artifact.
  - Validates required env-key bindings and placeholder secret-ref policy.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utilities for CLI arg parsing, JSON I/O, and path formatting.
  - Imported to reduce duplicate helper implementations.

## Edit Guide

- Change infra-binding schema or validation rules in `generate-scheduler-infra-binding.ts`.
- Change shared helper behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
