# Module 04 MVP Engine Module Guide

`mvp-engine.ts` is the deterministic runtime orchestrator for Module 04 efficacy quantification.

## File roles
- `mvp-engine.ts`
  - Validates runtime parameters and orchestrates inclusion/exclusion flow.
  - Builds final quantification output and runtime logs.
- `mvp-engine-helpers.ts`
  - Encapsulates normalization math and contribution scoring helpers.
  - Provides rule-map construction, measurement-window derivation, and user-result assembly.

## Why this split
- Keeps orchestration readable and easier to review.
- Isolates numeric/helper logic so future formula changes are localized.
