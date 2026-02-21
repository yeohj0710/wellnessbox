# Refactor Backlog (Hotspot Driven)

Base input: `npm run audit:hotspots`

## Completed in this cycle

1. `app/api/chat/actions/route.ts`
   - Reduced to thin orchestration route.
   - Extracted action logic into `lib/chat/actions/{shared,fallback,model}.ts`.
2. `app/chat/hooks/useChat.ts`
   - Extracted browser helpers, suggestions, evaluation logic.
   - Added `useChat.api.ts` to centralize chat endpoint calls.
3. `components/chat/DesktopChatDock.tsx`
   - Split dock panel from trigger container.
4. `components/chat/DesktopChatDockPanel.tsx`
   - Extracted session drawer layer into `DesktopChatDockSessionLayer.tsx`.
5. Agent maintenance tooling
   - Added `agent:skills-catalog` and `agent:refactor-report` scripts.
6. `app/api/health/nhis/fetch/route.ts`
   - Added DB cache replay protection + identity/request hashing.
   - Added cost guard caps (detail year scan / yearly detail call upper-bound).
   - Added low-cost client path and transparent cache metadata in response.
   - Extracted provider orchestration into `lib/server/hyphen/fetch-executor.ts`.
   - Added shared contracts in `lib/server/hyphen/fetch-contract.ts`.
   - Added force-refresh cooldown + in-flight dedupe guardrail.
   - Switched cooldown basis to latest fetch attempt (includes failed attempts) to block repeated paid retries.
   - Added server-side target policy block for high-cost NHIS targets by default.
7. `app/api/health/nhis/status/route.ts` + `/health-link`
   - Exposed cooldown/target policy state in status API.
   - Pre-disabled force-refresh UI actions while cooldown remains.
8. `app/(features)/health-link/HealthLinkClient.tsx`
   - Split shared presentational blocks into `components/HealthLinkCommon.tsx`.
   - Extracted status meta block into `components/HealthLinkStatusMeta.tsx`.
9. NHIS init/sign guard hardening
   - Added identity-aware `init` reuse path to avoid repeated paid init calls.
   - Added in-flight dedupe helper for `init/sign/fetch` concurrent duplicate requests.
   - Added `sign` short-circuit when already linked with same identity.
10. `app/(features)/health-link/useNhisHealthLink.ts`
   - Extracted fetch UI policy/constants into `fetchClientPolicy.ts`.
11. `app/api/health/nhis/fetch/route.ts` + `lib/server/hyphen/fetch-cache.ts`
   - Added identity-level cache fallback to absorb request-hash drift from date-window changes.
   - Added explicit cache source signaling (`db` vs `db-identity`) for observability.
   - Reset cache hit counters on fresh overwrite to keep cache telemetry accurate.
12. `app/api/health/nhis/fetch/route.ts`
   - Extracted cache replay + persistence helpers into `lib/server/hyphen/fetch-route-cache.ts`.
   - Reduced route responsibility to validation/auth/policy/orchestration.
13. `app/(features)/health-link/HealthLinkClient.tsx`
   - Extracted detail action toolbar to `components/HealthLinkFetchActions.tsx`.
   - Extracted raw JSON panel to `components/HealthLinkRawResponseSection.tsx`.
14. `app/(features)/health-link/HealthLinkClient.tsx`
   - Split header/auth/results presentation into:
     - `components/HealthLinkHeader.tsx`
     - `components/HealthLinkAuthSection.tsx`
     - `components/HealthLinkResultSection.tsx`
   - Kept page-level state/orchestration in client root and moved section markup out.
15. `app/api/health/nhis/fetch/route.ts`
   - Canonicalized `yearLimit` for summary-only targets to avoid cache key fragmentation.
   - Unified in-flight dedupe key across force/non-force fresh requests for lower duplicate call risk.
16. `app/(features)/health-link/*`
   - Added `copy.ts` + `view-model.ts` to separate copy/state derivation from rendering.
   - Reduced `HealthLinkClient.tsx` to orchestration-only composition.
17. `app/api/health/nhis/fetch/route.ts`
   - Removed dependency on pending easy-auth session in fetch path.
   - Fetch now uses persisted linked credentials only, reducing stale-session drift and paid-call risk.
18. NHIS paid-call budget guard (`fetch/status` + Prisma)
   - Added `HealthProviderFetchAttempt` model + migration for non-cached fetch-attempt logging.
   - Added rolling-window budget enforcement in `lib/server/hyphen/fetch-attempt.ts`.
   - `POST /api/health/nhis/fetch` now blocks over-limit fresh/force fetches with `429` + `Retry-After`.
   - `GET /api/health/nhis/status` now returns `fetchBudget` snapshot for UI transparency.
   - `/health-link` status meta now exposes fresh/force budget usage and remaining quota.
19. NHIS budget UX + maintenance hardening
   - Force-refresh buttons now pre-disable on both cooldown and budget-exhausted states.
   - Added budget-aware force-refresh hint text in `/health-link`.
   - Added maintenance script `maintenance:nhis-prune-attempts` to prune old fetch-attempt logs.
   - Documented retention env and prune runbook in NHIS API docs.
20. NHIS maintenance operations toolkit
   - Added `maintenance:nhis-prune-cache` for expired fetch-cache cleanup.
   - Added `maintenance:nhis-report-attempts` for recent window usage/success/force-rate reporting.
   - Added graceful migration-missing handling for maintenance scripts (`P2021` -> skip with guidance).
21. NHIS policy guard modularization + smoke check
   - Extracted fetch request policy helpers to `lib/server/hyphen/fetch-request-policy.ts`.
   - Added `maintenance:nhis-smoke-policy` to verify cooldown/target/year-limit invariants.
   - Optimized top-user attempt reporting query with DB-side aggregation (`$queryRaw`) for large datasets.
22. `app/chat/hooks/useChat.ts`
   - Extracted shared assistant stream orchestration into `useChat.assistant.ts`.
   - Extracted session-persist helpers into `useChat.persistence.ts`.
   - Reduced duplicate stream/sanitize/hydrate blocks and idempotent-save duplication.
23. NHIS force-refresh cost guard hardening
   - Added recent-cache replay guard for force-refresh requests (`db-force-guard` source).
   - Added env knob `HYPHEN_NHIS_FORCE_REFRESH_CACHE_GUARD_SECONDS` (default 1800s).
   - Exposed guarded-cache UX notice path through `/health-link` fetch notice policy.
24. NHIS cooldown accuracy hardening
   - Fixed latest-attempt resolver to read `HealthProviderFetchAttempt` (non-cached attempts) first.
   - Added fallback to cache timestamp when attempt table is unavailable (`P2021` compatibility path).
   - `GET /api/health/nhis/status` cooldown now aligns to latest attempt timestamp.
25. `app/chat/hooks` API wrapper consolidation
   - Added `requestSaveChatSession` and `requestDeleteChatSession` in `useChat.api.ts`.
   - Switched `useChat.persistence.ts` / `useChat.ts` delete flow to wrapper usage.
26. `/health-link` copy integrity cleanup
   - Replaced mojibake user-facing strings in `useNhisHealthLink.ts`, `constants.ts`, and `utils.ts`.
   - Centralized hook/workflow/status-meta/table copy into `copy.ts`.
   - Normalized status-details summary + fallback labels.
27. `app/chat/hooks/useChat.ts` state-update refactor
   - Added `useChat.sessionState.ts` for immutable session update helpers.
   - Replaced repeated inline `setSessions(...map...)` blocks with shared helpers.
28. `app/chat/hooks/useChat.ts` send-message preparation split
   - Added `useChat.sendMessage.ts` with `prepareOutgoingTurn`.
   - Reduced inline parsing/validation/message-construction logic in `sendMessage`.
29. `app/chat/hooks/useChat.ts` send-message branch resolver split
   - Added `useChat.sendMessageFlow.ts` to resolve assessment/offline/action/cart/stream branches.
   - Simplified `sendMessage` by removing duplicated branch-handling boilerplate.
30. `app/chat/hooks/useChat.ts` streamed-turn orchestration split
   - Added `useChat.streamTurn.ts` for shared stream/update/finalize lifecycle.
   - Unified chat/init streamed turn execution path to reduce duplication and drift risk.
31. `app/(components)/homeProductSection.tsx` presentational split + health-link duplicate-fetch guard
   - Extracted selected-pharmacy notice and load/empty status blocks into `homeProductSection.view.tsx`.
   - Added `useNhisHealthLink.ts` detail-fetch short-circuit when detailed rows are already loaded (no extra paid call).
   - Wired UI disabled/hint state for already-loaded detail path in health-link fetch actions.
32. `app/chat/hooks/useChat.ts` initial/bootstrap and session-action split
   - Added `useChat.initialAssistant.ts` to isolate empty-session bootstrap stream flow (guards/offline/error/stream lifecycle).
   - Added `useChat.sessionActions.ts` for session create/delete state transitions.
   - Reduced inline mutation logic in `useChat.ts` for startup/new/delete paths.
33. `app/chat/hooks/useChat.ts` finalize/assessment flow split
   - Added `useChat.finalizeFlow.ts` for title-generation + assistant turn finalize orchestration.
   - Added `useChat.assessmentFlow.ts` for in-chat assessment bootstrap/input flow.
   - Reduced inline assessment parser/evaluation branching and finalize post-processing in `useChat.ts`.
34. `app/chat/hooks/useChat.ts` follow-up fetch orchestration split
   - Added `useChat.followups.ts` to centralize suggestion/action follow-up fetch pipelines.
   - Moved fallback/history handling for suggestion generation out of `useChat.ts`.
   - Moved interactive action candidate resolution + fallback prioritization out of `useChat.ts`.

## Priority 1 (next)

1. `app/chat/hooks/useChat.ts` (~1247 lines)
   - Split cart-command + action-decision handlers into policy module.
2. `components/chat/DesktopChatDockPanel.tsx` (~991 lines)
   - Split header/feed/resize-hint into dedicated components.
3. `app/(components)/homeProductSection.tsx` (~948 lines)
   - Split data retrieval from rendering sections.

## Priority 2

1. `lib/chat/context.ts` (~916 lines)
   - Move classification and scoring utilities into focused files.
2. `components/order/orderDetails.tsx` (~858 lines)
   - Split summary/payment/status detail blocks.
3. `app/api/health/nhis/fetch/route.ts`
   - Add unit tests for cooldown/policy/cache-serve branches around orchestration helpers.
4. `app/(features)/health-link/HealthLinkClient.tsx`
   - Optional: split section cards into dedicated feature components if UI scope expands.

## Guardrails

- Keep auth checks in `lib/server/route-auth.ts`.
- Keep Prisma singleton only in `lib/db.ts`.
- Keep order stock mutation inside `lib/order/mutations.ts:createOrder`.
- Run `npm run audit:encoding` before and after major edits.
- Final verification baseline: `npm run lint` and `npm run build`.
