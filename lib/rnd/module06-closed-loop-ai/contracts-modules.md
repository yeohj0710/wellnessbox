# Module 06 Contracts Module Guide

`contracts.ts` remains the public entrypoint to keep all existing imports stable.

## File roles
- `contracts-types.ts`
  - Module constants (`RND_MODULE_06_*`)
  - All shared contract types (`RndModule06*`)
- `contracts-validators.ts`
  - Runtime type guards (`isRndModule06*`)
  - Assertion helpers (`assertRndModule06*`)
  - Depends on `contracts-types.ts`
- `contracts.ts`
  - Compatibility barrel that re-exports both files

## Why this split
- Keeps one import path (`./contracts`) while reducing file complexity.
- Separates static contract shape from runtime validation logic.
- Makes future contract extensions safer and easier to review in smaller diffs.
