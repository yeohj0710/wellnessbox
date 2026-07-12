# TIPS PRO Study Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete intermediate-evaluation study simulation in which testers register, answer baseline and follow-up PRO questionnaires, receive a model recommendation, and produce individual and cohort KPIs.

**Architecture:** A client-side study module stores versioned participant records in localStorage for repeatable evaluator demonstrations without database setup. It uses the protected TIPS lab API for recommendations, a pure scoring module for PRO/KPI calculations, and CSV export for raw study records.

**Tech Stack:** React 19, TypeScript, Next.js API, CSS Modules, localStorage, CSV.

---

### Task 1: PRO scoring engine
- Create `lib/tips/pro-study-engine.ts` with baseline/follow-up score, change, responder, completion, adherence and cohort KPI functions.
- Add executable assertions to `scripts/qa/check-tips-web-lab.cts`.

### Task 2: Tester study workflow
- Create `components/tips/ProStudySimulation.tsx`.
- Implement participant registration, baseline PRO, recommendation API execution, week-2/week-4 PRO, adherence and adverse-event inputs.
- Persist versioned records in browser localStorage and support selection/deletion/reset.

### Task 3: Results and export
- Display individual time-series comparison and cohort KPI summary.
- Export all raw records as UTF-8 BOM CSV.
- Add sample cohort generation for immediate institutional demonstration.

### Task 4: Integration and verification
- Add the module to `components/tips/InterimUserConsole.tsx` before the manual model console.
- Remove the placeholder PRO/follow-up action controls from the Agent section.
- Add institutional CSS in `components/tips/interim.module.css`.
- Run QA, TypeScript, lint, production build, and browser smoke tests.
