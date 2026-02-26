# Wellness Analysis Module Guide

`analysis.ts` remains the public orchestration entrypoint.

## File roles
- `analysis.ts`
  - Computes final wellness result payload.
  - Orchestrates scoring, section advice generation, and highlight selection.
- `analysis-answer-maps.ts`
  - Normalizes raw stored answers (`answersJson`, DB rows) into scoring-ready maps.
  - Resolves selected sections from common question `C27`.
  - Builds `CommonAnswerMap` and `SectionAnswerMapBySectionId`.

## Why this split
- Keeps parsing/normalization separate from score orchestration logic.
- Reduces cognitive load for future edits and bug fixes.
- Makes answer-shape normalization logic easier to test in isolation.
