# TIPS One-click Demonstration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce representative recommendation, safety, PRO, and agent flows without manual entry.

**Architecture:** Deterministic presets atomically populate UI state. A runner sends explicit preset data through the existing server state machine, avoiding React state timing dependencies.

**Tech Stack:** Next.js, React, TypeScript, `/api/tips/lab`.

---

### Task 1: Presets and runner
- [ ] Add normal, interaction, escalation profiles.
- [ ] Add input-only and complete-run controls.
- [ ] Show live step progress and retain editable inputs.

### Task 2: PRO shortcut
- [ ] Expose the existing sample cohort as a one-click complete PRO demonstration.

### Task 3: Verification and deployment
- [ ] Run QA, TypeScript, lint, build, commit, push, and deploy production.
