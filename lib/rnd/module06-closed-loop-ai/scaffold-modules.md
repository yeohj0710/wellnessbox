# Module 06 Scaffold Module Guide

`scaffold.ts` remains the entrypoint that assembles and validates Module 06 scaffold bundles.

## File roles
- `scaffold.ts`
  - Builds bundle from fixture records.
  - Runs structural and cross-reference assertions for loop inputs, prompts, decisions, executions, and logs.
- `scaffold-fixtures.ts`
  - Holds deterministic fixture records and output payloads used by scaffold generation.
  - Keeps static sample data separate from validation logic.

## Why this split
- Makes scaffold validation easier to read and review.
- Allows fixture data updates without touching assertion flow.
