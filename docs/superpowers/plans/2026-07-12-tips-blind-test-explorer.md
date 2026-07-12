# TIPS Blind Test Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let evaluators inspect and replay the original 5,000-case proxy blind test inside the protected TIPS web lab, while removing the excessive first-screen whitespace.

**Architecture:** Convert the immutable gzip research artifacts into a compact checked-in JSON bundle containing case profiles, proxy-gold labels, predictions, and per-case pass results. A server-only repository exposes filtered/paginated cases and recomputes aggregate metrics from the rows. The client explorer calls the protected existing TIPS API and shows aggregate verification plus a selectable case-level comparison.

**Tech Stack:** Next.js App Router, TypeScript, React, CSS Modules, Node.js QA scripts.

---

### Task 1: Lock expected behavior in QA

**Files:**
- Modify: `scripts/qa/check-tips-web-lab.cts`

- [ ] Assert the hero no longer uses `min-height: 520px`.
- [ ] Assert the protected API supports `list_blind_tests` and `verify_blind_tests`.
- [ ] Assert the explorer renders filters, pagination, case detail, gold/prediction comparison, and aggregate recomputation.
- [ ] Run `npm run qa:tips:web-lab`; expect failure before implementation.

### Task 2: Build the compact blind-test evidence bundle

**Files:**
- Create: `scripts/tips/build-blind-test-bundle.cts`
- Create: `data/tips/blind-test-cases.json`

- [ ] Read `proxy_cases.blind_test.jsonl.gz` and `recommendation_predictions.proxy_blind.jsonl.gz` from the interim simulation package.
- [ ] Join by `case_id`, retain all 5,000 rows, and store profile, proxy gold, prediction, precision, teacher session, verifier status, and provenance.
- [ ] Write deterministic JSON with source SHA-256 values and aggregate counts.
- [ ] Run the builder; expect `5000` joined rows and zero missing predictions.

### Task 3: Add server-side test repository and API actions

**Files:**
- Create: `lib/server/tips-lab/blind-tests.ts`
- Modify: `lib/server/tips-lab/runtime.ts`
- Modify: `app/api/tips/lab/route.ts`

- [ ] Implement filter values `all`, `matched`, `mismatched`, `safety`, and archetype search.
- [ ] Implement deterministic pagination and direct case lookup.
- [ ] Recompute exact-match, set precision, class support, and matched/mismatched totals from selected rows.
- [ ] Add `list_blind_tests` and `verify_blind_tests` actions behind existing TIPS authentication.
- [ ] Run QA and TypeScript; expect pass.

### Task 4: Build the interactive explorer

**Files:**
- Create: `components/tips/BlindTestExplorer.tsx`
- Modify: `components/tips/InterimUserConsole.tsx`
- Modify: `components/tips/interim.module.css`

- [ ] Show a prominent “블라인드 테스트 직접 검증” section before manual profile simulation.
- [ ] Add aggregate replay for all 5,000 rows and display numerator/denominator, not only percentages.
- [ ] Add filters, page navigation, random case selection, and case ID lookup.
- [ ] Show selected profile inputs, proxy-gold answer, model prediction, equality result, and provenance.
- [ ] Clearly state that replay validates proxy labels, not clinical effectiveness.
- [ ] Remove hero minimum height and reduce desktop/mobile top spacing.

### Task 5: Verify and release

**Files:**
- Modify: `scripts/qa/check-tips-web-lab.cts`

- [ ] Run `npm run qa:tips:web-lab`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- [ ] Verify desktop and mobile browser flows, including aggregate replay and individual case selection.
- [ ] Review diff without touching unrelated user changes.
- [ ] Commit, push `main`, deploy production, and verify `https://wellnessbox.kr/tips` plus protected API responses.
