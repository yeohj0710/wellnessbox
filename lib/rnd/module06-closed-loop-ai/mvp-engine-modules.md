# Module 06 MVP Engine Module Guide

`mvp-engine.ts` stays as the deterministic runtime orchestrator for Module 06.

## File roles
- `mvp-engine.ts`
  - Validates input collections and schema version.
  - Orchestrates decision, execution, consultation, trace/runtime logs, and final output assertions.
- `mvp-engine-policy.ts`
  - Encapsulates action-policy and mapping helpers.
  - Contains decision rationale, evidence derivation, execution channel/detail mapping, and consultation answer/evidence generation.

## Why this split
- Keeps orchestration readable while preserving deterministic behavior.
- Isolates policy changes to one file for faster reviews and safer edits.
