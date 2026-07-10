# TIPS Research Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the opaque TIPS recommendation demo with an evidence-backed research console that exposes the proxy dataset, model computation, safety filtering, seven KPI results, provenance, limitations, and real-data replacement path.

**Architecture:** Bundle a verified, immutable research-summary snapshot beside the existing model snapshot. Extend server-only inference to return active feature indices, per-feature linear contributions, count-class scores, all 14 ingredient probabilities, and pre/post-safety selections; render those values in focused React panels while retaining the signed state machine and hidden authenticated route.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, CSS Modules, Node crypto/static QA scripts, Vercel.

---

### Task 1: Research snapshot contract

**Files:**
- Create: `data/tips/interim-research-summary.json`
- Modify: `scripts/qa/check-tips-web-lab.cts`

- [ ] Add a failing QA assertion requiring the 150,000-record split, 7/7 KPI result, model card metadata, SHA-256 provenance, limitations, and replacement statuses.
- [ ] Run `npm run qa:tips:web-lab` and confirm it fails because the snapshot does not exist.
- [ ] Add the immutable JSON snapshot from the verified interim package artifacts.
- [ ] Run `npm run qa:tips:web-lab` and confirm all snapshot assertions pass.

### Task 2: Explainable inference contract

**Files:**
- Modify: `lib/server/tips-lab/model.ts`
- Modify: `lib/server/tips-lab/runtime.ts`
- Modify: `scripts/qa/check-tips-web-lab.cts`

- [ ] Add failing assertions for active features, count-class scores, intercepts, contribution sums, 14 ranked candidate probabilities, and safety-filter before/after lists.
- [ ] Run `npm run qa:tips:web-lab` and confirm the explainability assertions fail.
- [ ] Implement `explainProxyRecommendations` using the same coefficient arrays as production inference; do not invent SHAP values or call an external AI API.
- [ ] Return the explanation and bundled research snapshot from `recommend`, with blocked flags derived from the deterministic safety decision.
- [ ] Run the QA script and verify the original magnesium parity plus new arithmetic invariants pass.

### Task 3: Research console UI

**Files:**
- Create: `components/tips/ResearchOverview.tsx`
- Create: `components/tips/InferenceWorkbench.tsx`
- Create: `components/tips/ResearchEvidencePanel.tsx`
- Modify: `components/tips/InterimUserConsole.tsx`
- Modify: `components/tips/interim.module.css`
- Modify: `scripts/qa/check-tips-web-lab.cts`

- [ ] Add failing static UI assertions for dataset splits, 7 KPI cards, proxy/real distinction, active-feature contribution table, 14-candidate comparison, safety before/after pipeline, model formula, provenance hashes, and replacement plan.
- [ ] Run QA and confirm the new UI assertions fail.
- [ ] Implement the overview with 150k split bars, generator/verifier/adjudicator counts, KPI values with sample sizes and confidence intervals, and explicit proxy-only disclosure.
- [ ] Implement the inference workbench showing `z = intercept + Σ(weight × active feature)`, sigmoid conversion, selected-count classifier, all candidates, and safety exclusions.
- [ ] Implement evidence/provenance and replacement panels using only bundled verified facts.
- [ ] Preserve mobile readability, keyboard states, `aria-live`, and the hidden route.

### Task 4: Verification

**Files:**
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] Run `npm run qa:tips:web-lab`; expect exit 0.
- [ ] Run `npm run qa:tips:interim`; expect exit 0.
- [ ] Run `npx tsc --noEmit`; expect exit 0.
- [ ] Run `npm run lint`; expect no warnings or errors.
- [ ] Run `npm run build`; expect exit 0 and `/tips` in the route table.
- [ ] Test authenticated desktop and mobile flows: normal recommendation, safety exclusion, consent failure, evidence action, and terminal escalation.

### Task 5: Release

**Files:**
- Commit only TIPS research-console files; preserve unrelated working-tree edits.

- [ ] Commit with a focused message.
- [ ] Push `main` to `origin`.
- [ ] Deploy to Vercel production and confirm the `wellnessbox.kr` alias.
- [ ] Re-run the authenticated production recommendation and confirm the explanation and KPI panels render from the deployed API response.
