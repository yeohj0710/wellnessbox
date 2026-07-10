# Hidden TIPS Web Lab Implementation Plan

> **For agentic workers:** Execute inline in this session. Keep the existing remote R&D API path intact while adding a deployable embedded lab path.

**Goal:** Make the trained TIPS proxy model and bounded safety/Agent flow usable directly from the WellnessBox website at an unlisted, authenticated, noindex route without starting a Python process.

**Architecture:** Export the registered scikit-learn proxy model into a versioned JSON snapshot and evaluate it inside a server-only Next.js module. Add one authenticated stateless lab Route Handler that validates profile, consent and action requests, applies deterministic safety gates, runs the embedded model, and returns the next Agent state. Rework the existing `/tips` console to call this route; keep the existing Python proxy routes for future production R&D integration.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, existing route authentication, generated JSON model snapshot, CSS Modules.

---

### Task 1: Export and lock the trained proxy model

**Files:**
- Create: `scripts/tips/export-proxy-model.py`
- Create: `data/tips/proxy-recommendation-model.json`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] Export vocabulary, ingredient estimators, count classifier, model hash and source mode from the registered joblib artifact.
- [ ] Reject any model whose mode is not `PROXY_GOLD_SIMULATION`.
- [ ] Add QA assertions for the expected model hash, 14 ingredients and coefficient dimensions.

### Task 2: Implement server-only embedded inference and safety

**Files:**
- Create: `lib/server/tips-lab/model.ts`
- Create: `lib/server/tips-lab/runtime.ts`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] Reproduce Python feature tokenization, sigmoid probabilities and count-class selection.
- [ ] Apply deterministic emergency, pregnancy, kidney/liver, allergy, duplicate and medication warnings before returning recommendations.
- [ ] Implement bounded lab states and consent-scoped actions without server memory.
- [ ] Return simulation disclosure, model hash and evidence status on every response.

### Task 3: Add authenticated hidden lab API

**Files:**
- Create: `app/api/tips/lab/route.ts`
- Modify: `lib/server/wb-rnd-interim-route.ts`
- Test: `scripts/qa/check-tips-web-lab.cts`

- [ ] Require the existing user session inside the Route Handler.
- [ ] Limit JSON request size and validate allowed action names.
- [ ] Set `Cache-Control: no-store` and return structured 4xx errors.

### Task 4: Replace the research console with a usable guided lab

**Files:**
- Modify: `components/tips/InterimUserConsole.tsx`
- Modify: `components/tips/interim.module.css`
- Modify: `app/(features)/tips/page.tsx`

- [ ] Add profile controls for age, goals, conditions and medication classes.
- [ ] Add explicit simulation consent and guided recommendation, evidence, follow-up, PRO and adverse-event actions.
- [ ] Present recommendations and safety decisions as readable UI instead of raw JSON only.
- [ ] Preserve a technical trace panel for research verification.
- [ ] Add `robots: noindex, nofollow` and keep the route out of site navigation.

### Task 5: Verify the complete web flow

**Files:**
- Modify: `package.json`
- Modify: `docs/tips/interim-service-env.md`

- [ ] Add `qa:tips:web-lab` script.
- [ ] Run QA, typecheck, lint and production build.
- [ ] Start the production build and capture desktop/mobile `/tips` screenshots.
- [ ] Confirm no navigation link exposes `/tips`, unauthenticated API requests return 401, and browser console errors are zero.
- [ ] Commit only task-owned files; preserve the user's unrelated working-tree changes.
