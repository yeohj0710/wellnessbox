# Refactor Hotspots (Agent Handoff)

Last validated: 2026-02-25

This document tracks large/complex files that are most likely to slow down follow-up sessions.

## Prioritized Runtime Targets

1. `app/chat/hooks/useChat.ts`
   - High state density + side effects.
   - Suggested split: network orchestration, state selectors, UI event handlers.
2. `app/(components)/homeProductSection.tsx`
   - Large render tree and interaction logic in one file.
   - Suggested split: list item card, filter bar, sorting/paging model.
3. `components/order/orderDetails.tsx`
   - Dense conditional UI logic.
   - Suggested split: status panel, payment panel, line-items table.
4. `app/chat/components/recommendedProductActions.resolve.ts`
   - Recommendation resolver with catalog matching + price scoring.
   - Suggested split: matching rules and IO/cache boundary.
5. `lib/ai/chain.ts`
   - Core AI chain orchestration with broad responsibilities.
   - Suggested split: prompt construction, context gathering, and post-processing.

## Recently Completed Splits

1. `lib/chat/context.ts`
   - Refactored into:
     - `lib/chat/context.types.ts`
     - `lib/chat/context.base.ts`
     - `lib/chat/context.profile.ts`
     - `lib/chat/context.assessment.ts`
     - `lib/chat/context.history.ts`
     - `lib/chat/context.prompt.ts`
     - `lib/chat/context.summary.ts`
     - `lib/chat/context.suggestions.ts`
   - `lib/chat/context.ts` now acts as a small façade/re-export layer.
2. `app/(features)/health-link/components/HealthLinkResultSection.tsx`
   - Refactored into shell/content/helpers blocks and separate loading/failure panels.
3. `app/chat/components/recommendedProductActions.utils.ts`
   - Refactored into:
     - `recommendedProductActions.types.ts`
     - `recommendedProductActions.shared.ts`
     - `recommendedProductActions.parse.ts`
     - `recommendedProductActions.resolve.ts`
     - `recommendedProductActions.cart.ts`
   - `recommendedProductActions.utils.ts` now acts as a façade/re-export layer.
4. `lib/b2b/report-payload.ts`
   - Refactored into:
     - `lib/b2b/report-payload-analysis.ts`
     - `lib/b2b/report-payload-types.ts`
   - `report-payload.ts` now focuses on DB fetch orchestration and final payload assembly.

## Guardrails For Any Refactor

1. Do not change auth ownership checks in API routes without `lib/server/route-auth.ts`.
2. Keep NHIS low-cost fetch defaults intact (`checkupOverview`, `medication`).
3. Keep AI summary enrichment non-blocking for fetch core flow.
4. Run before merge:
   - `npm run audit:encoding`
   - `npm run lint`
   - `npm run build`

## Existing NHIS Maintenance Scripts

1. `npm run maintenance:nhis-smoke-policy`
2. `npm run maintenance:nhis-smoke-ai-summary`
3. `npm run maintenance:nhis-report-attempts`
4. `npm run maintenance:nhis-prune-attempts`
5. `npm run maintenance:nhis-prune-cache`
