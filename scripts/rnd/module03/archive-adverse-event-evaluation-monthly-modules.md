# Module03 Archive Monthly Evaluation Modules

`archive-adverse-event-evaluation-monthly.ts` runs Module03 KPI #6 monthly evaluation archiving from exported source rows.

## File Roles

- `archive-adverse-event-evaluation-monthly.ts`
  - Runs ops evaluation, writes monthly report, updates archive manifest, and applies retention policy.
  - Keeps archive-domain logic such as month bucketing and pruning safety checks.
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Shared utilities for validation, JSON I/O, and path formatting.
  - Imported to remove repeated helper code.

## Edit Guide

- Change archive lifecycle or retention behavior in `archive-adverse-event-evaluation-monthly.ts`.
- Change common utility behavior in `orchestrate-adverse-event-evaluation-monthly-helpers.ts`.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
