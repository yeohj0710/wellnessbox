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
35. `lib/notification/core.ts` push fanout boundary split
   - Extracted push runtime/env policy helpers to `lib/notification/core.runtime.ts`.
   - Extracted push error classification + Prisma error guards to `lib/notification/core.error.ts`.
   - Extracted push delivery dedupe/finalize/dead-endpoint cleanup to `lib/notification/core.delivery-gate.ts`.
   - Added shared push types in `lib/notification/core.types.ts`.
   - Reduced `core.ts` to subscription/query + fanout orchestration flow.
36. `lib/server/result-normalizer.ts` snapshot normalization boundary split
   - Added `lib/server/result-normalizer.types.ts` for snapshot/result contracts + version constants.
   - Added `lib/server/result-normalizer.shared.ts` for parser/normalizer primitives.
   - Split assess-specific logic into `lib/server/result-normalizer.assess.ts`.
   - Split check-ai-specific logic into `lib/server/result-normalizer.check-ai.ts`.
   - Reduced `lib/server/result-normalizer.ts` to stable export surface + snapshot-version assertion.
37. `app/my-data/page.tsx` server-data orchestration split
   - Added `app/my-data/myDataPageData.ts` to isolate session/actor/appUser lookup and DB query orchestration.
   - Reduced page-level responsibilities to route guard + view composition.
   - Replaced inline profile-phone cast with typed helper (`readProfilePhone`).
38. `lib/product/product.ts` query duplication cleanup
   - Added shared in-stock where/select/order constants (`IN_STOCK_PRODUCT_WHERE`, `PRODUCT_CARD_SELECT`, `DEFAULT_PRODUCT_ORDER`).
   - Deduplicated `getProducts`/`getProductsByUpdatedAt` through `findProductsForCards`.
   - Replaced repeated relation id formatter (`any[]`) with typed helper `mapRelationIds`.
39. `app/(orders)/order-complete/page.tsx` payment/orchestration cleanup
   - Added `app/(orders)/order-complete/orderCompleteFlow.ts` for payment-context parsing, order-draft hydration, payment-outcome normalization, and checkout/payment storage cleanup helpers.
   - Replaced duplicated inicis/non-inicis order-create branches with one shared `createOrderFromPaymentOutcome` path.
   - Added lock release safety (`finally`) and non-OK payment-info response handling to prevent stale local storage loops.
   - Removed unused login-status fetch from order-complete page.
   - Added semantic/accessibility polish (`main` landmark, `aria-live` push status toast, focus-visible rings).
40. `app/chat/components/MessageBubble.tsx` markdown-rendering boundary split
   - Added `app/chat/components/messageBubble.markdown.tsx` for markdown plugin configuration and renderer component map.
   - Added `app/chat/components/messageBubble.format.ts` for shared message-text newline normalization.
   - Reduced in-component object churn by memoizing remark/rehype plugin lists and markdown component map.
   - Kept loading/copy/chat bubble orchestration in `MessageBubble.tsx` while moving render policy helpers out.
41. `app/api/get-payment-info/route.ts` payment verification safety hardening
   - Replaced ad-hoc body parsing with `zod` request validation (`paymentId`, `paymentMethod` required).
   - Added explicit env validation for PortOne v1/v2 credentials before remote calls.
   - Split PortOne v1/v2 token/payment lookup paths into dedicated helpers with shared error parsing.
   - Normalized API error responses (`400` invalid input, `500` provider/runtime failure) for predictable caller handling.
42. `app/(components)/homeProductSection.tsx` UI action boundary split
   - Added `app/(components)/useHomeProductActions.ts` for product-detail/cart open-close callbacks and scroll/return-path restore behavior.
   - Removed inline `restoreScroll`, `openProductDetail`, `closeProductDetail`, `openCart`, `closeCart` blocks from page component.
   - Kept page-level state/effect orchestration in `homeProductSection.tsx` and moved only imperative UI action handlers.
43. `app/assess/page.tsx` storage boundary split
   - Added `app/assess/lib/assessStorage.ts` for assess state load/save/clear helpers and C-section rollback helper.
   - Replaced direct inline `localStorage` snapshot/rollback mutations in page with storage helper calls.
   - Kept question flow/evaluation orchestration in page component while isolating persistence concerns.
44. `app/(components)/useHomeProductSectionEffects.ts` effect-module boundary split
   - Split monolithic effect module into dedicated files:
     - `useHomeProductSectionEffects.ui.ts`
     - `useHomeProductSectionEffects.query.ts`
     - `useHomeProductSectionEffects.lifecycle.ts`
     - `useHomeProductSectionEffects.computation.ts`
   - Added shared type aliases in `homeProductSectionEffects.types.ts`.
   - Converted `useHomeProductSectionEffects.ts` into a stable barrel export surface to keep call sites unchanged.
45. `lib/product/product.ts` product-module boundary split
   - Added `lib/product/product.shared.ts` for shared in-stock where/select/order constants and rating-default mapper.
   - Added `lib/product/product.catalog.ts` for card list, updated list, name list, and summary query paths.
   - Added `lib/product/product.admin.ts` for admin CRUD/query paths and typed relation-id mapping helper.
   - Kept `lib/product/product.ts` as the stable export surface and chat-catalog pricing-selection logic with async wrapper exports.
46. `lib/server/client-link.ts` client-resolution boundary split
   - Added `lib/server/client-link.session.ts` for session-context resolution and appUser client lookup helpers.
   - Added `lib/server/client-link.merge.ts` for client merge selection/merge execution/masked phone helpers.
   - Reduced `lib/server/client-link.ts` to attach/resolve orchestration with shared helper imports.
   - Preserved auth/ownership behavior while shrinking high-cyclomatic merge/session internals from the main entry module.
47. `lib/server/hyphen/client.ts` transport boundary split
   - Added `lib/server/hyphen/client.contracts.ts` for endpoint constants and Hyphen request/response contracts.
   - Added `lib/server/hyphen/client.runtime.ts` for auth-header/env timeout/common parsing helpers.
   - Added `lib/server/hyphen/client.request.ts` for `hyphenPost` transport and `HyphenApiError` classification.
   - Reduced `lib/server/hyphen/client.ts` to stable export surface + endpoint wrapper composition.
48. `lib/server/hyphen/fetch-executor.ts` helper-boundary split
   - Added `lib/server/hyphen/fetch-executor.helpers.ts` for date/year parsing, detail-key extraction, list merge, and medication probe-window helpers.
   - Reduced `lib/server/hyphen/fetch-executor.ts` to orchestration flow + failure policy handling.
   - Preserved endpoint call order and partial-failure semantics while lowering core executor size.
49. `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.ts` runtime boundary split
   - Added `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.shared.ts` for deterministic run-id/source-map/group/sort/source-summary helpers.
   - Added `lib/rnd/module07-biosensor-genetic-integration/mvp-engine.artifacts.ts` for session artifact payload/evidence/lineage construction.
   - Reduced `mvp-engine.ts` to input validation + wiring/orchestration loop while preserving deterministic output contracts.

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
