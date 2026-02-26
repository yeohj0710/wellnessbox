# Module03 CLI Helpers Modules

`cli-helpers.ts` provides shared argument and validation helpers for Module03 scheduler scripts.

## File Roles

- `cli-helpers.ts`
  - Reusable helpers for repeated CLI patterns:
    - `getArgValues`
    - `hasFlag`
    - `assertEnvironmentVariableName`
    - `parsePositiveInteger`
    - `parseKeyValuePair`
- `orchestrate-adverse-event-evaluation-monthly-helpers.ts`
  - Base utility layer used by `cli-helpers.ts` for shared string validation.

## Edit Guide

- Change repeated CLI parsing behavior in `cli-helpers.ts`.
- Keep domain-specific checks in each script file and avoid moving business rules into helpers.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
