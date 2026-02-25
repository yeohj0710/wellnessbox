# B2B Report Summary Map

## Purpose
- Keep summary card UI changes safe while data contracts evolve.
- Separate payload contract from rendering implementation for easier follow-up changes.

## Boundaries
- Summary UI renderer:
  - `components/b2b/ReportSummaryCards.tsx`
- Summary helper functions (formatting/score view helpers):
  - `components/b2b/report-summary/helpers.ts`
- Shared payload contract:
  - `lib/b2b/report-summary-payload.ts`
- Score policy and resolution:
  - `lib/b2b/report-score-profile.ts`
  - `lib/b2b/report-score-engine.ts`

## Editing guide
1. If payload schema changes:
   - update `lib/b2b/report-summary-payload.ts` first.
   - then fix compile errors in renderer/admin client.
2. If score logic changes:
   - update score profile/engine, not renderer first.
3. If UI cards/charts change:
   - keep `ReportSummaryCards.tsx` focused on presentation and derived view models.
   - move pure helper logic to `components/b2b/report-summary/helpers.ts` to avoid
     page-level runtime regressions.

## Quick checks
- `npm run lint`
- `npm run build`
- `npm run qa:cde:regression`
