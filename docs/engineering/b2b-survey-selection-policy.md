# B2B Survey Selection Policy (Completeness-First)

Last updated: 2026-03-05

## Why this exists
- A single employee can have multiple submitted survey rows in the same `periodKey`.
- Picking only the latest `updatedAt` can select an accidentally short/incomplete submission.
- This causes report section gaps (for example only routine guide appears, while section comments and supplement design disappear).

## Selection rule
When multiple submitted rows exist, choose the row with highest completeness in this order:

1. `answers.length` (descending)
2. `section answers count` (descending): number of answers where `sectionKey` is present
3. `selectedSections.length` (descending)
4. `updatedAt` (descending)

## Shared implementation
- Utility file:
  - `lib/b2b/survey-response-completeness.ts`
- Used by:
  - `lib/b2b/analysis-service.ts` (`findLatestSurveyForPeriod`)
  - `lib/b2b/report-payload.ts` (`findBestSurveyByPeriodOrFallback`)

This keeps report payload generation and analysis recomputation aligned.

## Fallback wellness policy
In report payload assembly:
- Primary source: `latestAnalysis.payload.wellness`
- Fallback source: recompute from selected survey answers (`computeWellnessResult`)
- If fallback has richer detail (more section advice/supplement/section need/routine rows), fallback is used.

## QA
- Comparator/picker regression check:
  - `npm run qa:b2b:survey-completeness`
- Full build guard:
  - `npm run build`

## Operational note
- Report payload version was increased to force regeneration of stale snapshots on next access.
- If UI still shows old sections, open the report route again to trigger regeneration.
