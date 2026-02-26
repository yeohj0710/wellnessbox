# Module03 Scheduler Deployment Bundle Modules

`generate-scheduler-deployment-bundle.ts` builds the deployment bundle artifact for Module03 KPI #6 scheduler rollout.

## File Roles

- `generate-scheduler-deployment-bundle.ts`
  - Produces scheduler deployment bundle JSON from CLI inputs and defaults.
  - Defines scheduler command templates, secret-key requirements, and verification expectations.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utility functions for common CLI parsing and path formatting.
  - Imported to reduce duplicated helper code.

## Edit Guide

- Change bundle schema or scheduler command composition in `generate-scheduler-deployment-bundle.ts`.
- Change shared helper behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
