# Module03 Node Script Runner Modules

`node-script-runner.ts` centralizes child-process execution helpers used by Module03 scheduler orchestration scripts.

## File Roles

- `node-script-runner.ts`
  - Validates runner file existence (`assertRunnerExists`).
  - Executes Node scripts with optional env overrides (`runNodeScript`).
  - Formats consistent failure diagnostics (`formatCommandFailure`).

## Edit Guide

- Update process execution options or failure formatting in `node-script-runner.ts`.
- Keep high-level orchestration and business decisions in caller scripts.

## Minimum Validation

- `npm run audit:encoding`
- `npm run lint`
- `npm run audit:hotspots`
