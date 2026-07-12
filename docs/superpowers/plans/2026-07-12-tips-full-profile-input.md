# TIPS Full Profile Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the deployed model's complete 93-feature input space in the web research console and ensure UI values map exactly to training vocabulary tokens.

**Architecture:** Extend `TipsLabProfile` with structured demographics, preferences, diet, labs, symptoms, wearable and genetic features. A dedicated advanced profile component owns grouped institutional inputs while the shared proxy engine produces exact training-compatible tokens.

**Tech Stack:** React, TypeScript, Next.js, CSS Modules.

---

### Task 1: Correct and extend model feature mapping
- Extend `TipsLabProfile` and `profileTokens` in `lib/tips/proxy-model-engine.ts`.
- Replace incorrect decade aliases with exact `18-29` through `70+` vocabulary values.
- Add executable token assertions.

### Task 2: Parse extended API profiles
- Extend `lib/server/tips-lab/runtime.ts` profile normalization for all new arrays, preferences, labs and symptoms.
- Preserve deterministic safety behavior.

### Task 3: Full research input UI
- Create `components/tips/AdvancedProfileFields.tsx`.
- Add demographics, preferences, goals, conditions, medicines, diets, supplements, labs, symptoms, wearable and risk inputs.
- Integrate into `InterimUserConsole.tsx` and show active feature coverage.

### Task 4: Verification and release
- Update TIPS QA for exact vocabulary mapping and new input groups.
- Run QA, TypeScript, lint, production build and browser interaction checks.
- Commit, push and deploy production.
