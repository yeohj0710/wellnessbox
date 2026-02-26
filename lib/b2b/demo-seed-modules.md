# Demo Seed Module Guide

`demo-seed.ts` remains the orchestration entry for admin demo seeding flows.

## File roles
- `demo-seed.ts`
  - DB upsert orchestration for employee, period report, survey, and health rows
  - Uses normalized answer helpers and seed builders
- `demo-seed-builders.ts`
  - Demo employee seed presets
  - Common/section answer builders
  - Mock health payload generation
- `demo-seed-survey-normalize.ts`
  - Raw survey answer normalization
  - Question option score resolution

## Why this split
- Keeps transactional seed orchestration separate from mock data generation.
- Makes survey answer normalization reusable and independently testable.
- Reduces risk when adjusting demo scenarios versus DB write flows.
