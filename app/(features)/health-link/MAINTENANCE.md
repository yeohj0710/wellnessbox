# Health Link Maintenance Guide

This file is for engineers/agents who continue work on `/health-link`.

## Fast Entry Points

1. `app/(features)/health-link/HealthLinkClient.tsx`
   - Top-level composition for auth stage vs result stage.
2. `app/(features)/health-link/useNhisHealthLink.ts`
   - Client workflow state machine and API orchestration.
3. `app/(features)/health-link/components/HealthLinkResultSection.tsx`
   - Result-stage shell; delegates to smaller blocks.
4. `app/(features)/health-link/components/HealthLinkResultContent.tsx`
   - Main card/metric rendering logic.
5. `app/api/health/nhis/fetch/route.ts`
   - Server fetch execution, caching, budget guardrails, and persistence.
6. `lib/server/hyphen/fetch-executor.ts`
   - Hyphen target execution strategy (low-cost defaults, fallback behavior).
7. `lib/server/hyphen/fetch-ai-summary.ts`
   - AI summary enrichment (`gpt-4o-mini`) with fallback path.

## Non-Negotiable Behavior

1. Keep default summary fetch low-cost:
   - `checkupOverview`, `medication`.
2. Never request medication in bulk blindly:
   - latest-first probing must stay in `fetch-executor`.
3. Do not block user flow on AI summary errors:
   - AI enrichment must be best-effort and fallback-safe.
4. Keep cache-first behavior:
   - identical request should prefer DB/memory cache before upstream call.

## Recent Refactor Notes

1. Request/timeout/error helper logic moved to:
   - `app/(features)/health-link/request-utils.ts`
2. Client fetch workflow simplified in:
   - `app/(features)/health-link/useNhisHealthLink.ts`
   - summary fetch is now the only UI-triggered fetch path
   - unused client-only detail/force-refresh handlers were removed
3. Result UI split into smaller blocks:
   - `HealthLinkResultSection` (shell)
   - `HealthLinkResultContent` (primary content)
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
