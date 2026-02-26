# Module 05 MVP Engine Module Guide

`mvp-engine.ts` remains the deterministic orchestrator for Module 05 optimization.

## File roles
- `mvp-engine.ts`
  - Validates runtime inputs and objective weights.
  - Orchestrates combination generation, filtering, ranking, trace logs, and output assembly.
- `mvp-engine-helpers.ts`
  - Encapsulates scoring utilities and combination helper functions.
  - Owns token normalization, constraint maps, reason-code generation, and combo-id creation.

## Why this split
- Keeps orchestration logic short and review-friendly.
- Isolates scoring/policy helper changes from runtime flow changes.
