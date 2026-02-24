# Health Link Maintenance Guide

This file is for engineers/agents who continue work on `/health-link`.

## Fast Entry Points

1. `app/(features)/health-link/HealthLinkClient.tsx`
   - Top-level composition for auth stage vs result stage.
2. `app/(features)/health-link/useNhisHealthLink.ts`
   - Client workflow state machine and API orchestration.
3. `app/(features)/health-link/useNhisActionRequest.ts`
   - Shared POST request executor (`timeout + error-code normalization + session-expired mapping`).
4. `app/(features)/health-link/useNhisSummaryAutoFetch.ts`
   - Auto-fetch side effects (`after sign`, `on entry`, `budget-block sync`).
5. `app/(features)/health-link/useNhisHealthLink.helpers.ts`
   - Input validation + summary budget-block + success notice helpers.
6. `app/(features)/health-link/components/HealthLinkResultSection.tsx`
   - Result-stage shell; delegates to smaller blocks.
7. `app/(features)/health-link/components/HealthLinkResultContent.tsx`
   - Result-stage orchestrator (`summary -> checkup -> optional medication`).
8. `app/(features)/health-link/components/HealthLinkSummaryHero.tsx`
   - Top priority summary block (single hero card).
9. `app/(features)/health-link/components/HealthLinkCheckupSection.tsx`
   - Checkup list + category tabs + expand/collapse.
10. `app/(features)/health-link/components/HealthLinkMedicationOptionalSection.tsx`
   - Collapsed optional medication section (`details`).
11. `app/(features)/health-link/components/HealthLinkFetchActions.tsx`
   - Primary action + secondary options (`다른 사람으로 조회` is hidden by default).
12. `app/api/health/nhis/fetch/route.ts`
   - Server fetch execution, caching, budget guardrails, and persistence.
13. `lib/server/hyphen/fetch-executor.ts`
   - Hyphen target execution strategy (low-cost defaults, fallback behavior).
14. `lib/server/hyphen/fetch-ai-summary.ts`
   - AI summary enrichment (`gpt-4o-mini`) with fallback path.
15. `lib/server/hyphen/fetch-ai-summary-core.ts`
   - OpenAI JSON contract + fallback summary/metric insights generation.

## Non-Negotiable Behavior

1. Keep default summary fetch low-cost:
   - `checkupOverview`, `medication`.
2. Keep provider fanout minimal:
   - summary path should call `checkupOverview` once and `medication` once.
   - avoid multi-window retry fanout in default flow.
3. Do not block user flow on AI summary errors:
   - AI enrichment must be best-effort and fallback-safe.
4. Keep cache-first behavior:
   - identical request should prefer DB/memory cache before upstream call.
5. Keep mobile-first information hierarchy:
   - one primary summary block first
   - optional actions/details should stay collapsed by default
   - avoid duplicating the same metric card across multiple top-level sections.

## Recent Refactor Notes

1. Request/timeout/error helper logic moved to:
   - `app/(features)/health-link/request-utils.ts`
2. Client fetch workflow simplified in:
   - `app/(features)/health-link/useNhisHealthLink.ts`
   - summary fetch is now the only UI-triggered fetch path
   - unused client-only detail/force-refresh handlers were removed
3. Result UI split into smaller blocks:
   - `HealthLinkResultSection` (shell)
   - `HealthLinkResultContent` (content composition)
   - `HealthLinkSummaryHero` (single high-priority summary card)
   - `HealthLinkCheckupSection` (checkup exploration)
   - `HealthLinkMedicationOptionalSection` (collapsed optional details)
   - `HealthLinkResultLoadingPanel` / `HealthLinkResultFailureNotice`
   - `HealthLinkResultSection.helpers` (shared logic)
4. Health metric tone rules moved to:
   - `app/(features)/health-link/utils-health-metric-tone.ts`
   - keeps `utils-health-data.ts` focused on row shaping/aggregation.
5. AI summary smoke test added:
   - `scripts/maintenance/smoke-hyphen-ai-summary.cts`
   - run with `npm run maintenance:nhis-smoke-ai-summary`
6. Accessibility improvements added for:
   - fetch action button busy state
   - auth/result notices (`role`, `aria-live`)
   - metric filter chips (`aria-pressed`)
7. AI summary payload extended:
   - `normalized.aiSummary.metricInsights[]` is now supported
   - fallback path also returns metric insights to avoid empty guidance.
8. Duplicate-heavy first view reduced:
   - collapsed checkup preview now defers metrics already shown in summary insights
   - users can still inspect all metrics via `검진 항목 더 보기`.

## UI Intent (Do Not Regress)

1. Primary actions:
   - show one large CTA for core task (`최신 결과 다시 조회`)
   - keep secondary actions in a collapsed `기타 옵션`.
2. Card density:
   - keep top-level card count low; avoid stacked redundant sections.
   - on mobile, prefer list-style metric rows over repeated boxed cards.
3. Information priority:
   - `핵심 요약` first
   - `검진 항목` second (expand/collapse for long lists)
   - medication details are optional unless medication-only mode.

## Safe Validation Checklist

1. `npm run audit:encoding`
2. `npm run maintenance:nhis-smoke-policy`
3. `npm run maintenance:nhis-smoke-ai-summary`
4. `npm run lint`
5. `npm run build`

## Manual Scenario Checklist

1. Existing linked user opens `/health-link`:
   - summary auto-fetch and visible cards.
2. Same identity with cache:
   - init can short-circuit and reuse DB cache.
3. Session-expired flow:
   - reauth guidance shown without hard technical error wording.
4. Medication-only user:
   - no blocking "failure" framing; medication-focused summary shown.
