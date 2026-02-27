# Module03 Scheduler Deployment Bundle Modules

`generate-scheduler-deployment-bundle.ts` builds the deployment bundle artifact for Module03 KPI #6 scheduler rollout.

## File Roles

- `generate-scheduler-deployment-bundle.ts`
  - Orchestration entry (`parseArgs` -> `buildBundle` -> output write/stdout).
- `scheduler-deployment-bundle-cli.ts`
  - Deployment-bundle CLI orchestration entry (`field parser wiring -> CliArgs assembly`).
- `scheduler-deployment-bundle-cli-defaults.ts`
  - Deployment-bundle CLI default constants (cron/timezone/retention/path/env-key defaults).
- `scheduler-deployment-bundle-cli-fields.ts`
  - CLI field parser/validation helpers (`--cadence-cron`, `--timezone`, `--retention-months`, schema/sql path checks, failure webhook env key checks).
- `scheduler-deployment-bundle-artifacts.ts`
  - Command-template derivation and section builders (warehouse/secrets/artifacts/verification) plus final bundle composition.
- `scheduler-deployment-bundle-types.ts`
  - Shared CLI and artifact contracts plus module/kpi identity constants.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for common CLI parsing and path formatting.
  - Imported to reduce duplicated helper code.

## Edit Guide

- Change CLI default constants in `scheduler-deployment-bundle-cli-defaults.ts`.
- Change argument/default validation in `scheduler-deployment-bundle-cli-fields.ts`.
- Change CLI argument wiring in `scheduler-deployment-bundle-cli.ts`.
- Change bundle schema or scheduler command composition in `scheduler-deployment-bundle-artifacts.ts`.
- Change shared helper behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
