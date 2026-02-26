# Module03 Scheduler Readiness Modules

Shared modules for Module03 KPI #6 production-readiness validation.

## File Roles

- `scheduler-readiness-artifacts.ts`
  - Defines artifact schemas used by readiness validation.
  - Parses handoff summary / infra binding JSON payloads with strict validation.
- `scheduler-readiness-checks.ts`
  - Defines readiness check rule set and report detail messages.
  - Computes pass/fail checks from parsed artifacts and CLI options.

## Edit Guide

- Update artifact schema parsing in `scheduler-readiness-artifacts.ts`.
- Update validation policy checks in `scheduler-readiness-checks.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
