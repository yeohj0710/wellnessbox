# Module 07 Scaffold Module Guide

`scaffold.ts` remains the public scaffold entry and validator.

## File roles
- `scaffold.ts`
  - Builds integration output summary from fixture records.
  - Performs end-to-end structural assertions for Module 07 scaffold bundles.
- `scaffold-fixtures.ts`
  - Provides deterministic fixture records (sessions, metrics, variants, adjustments, write logs).
  - Keeps large static sample data isolated from orchestration/validation logic.

## Why this split
- Reduces noise in scaffold runtime logic.
- Makes fixture updates easier without touching validation flow.
