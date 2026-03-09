# B2B Integrated Result Preview Modules

## Summary

- Extracted payload-to-preview normalization from `app/(admin)/admin/b2b-reports/_components/B2bIntegratedResultPreview.tsx` into `app/(admin)/admin/b2b-reports/_lib/b2b-integrated-result-preview-model.ts`.
- Split the two large card families into `B2bIntegratedHealthMetricsSection.tsx` and `B2bIntegratedMedicationReviewSection.tsx`.
- Kept `B2bIntegratedResultPreview.tsx` focused on composition: memoized preview-model creation plus section wiring.

## Why

- The previous file mixed a large wellness-result normalization path with two unrelated UI sections.
- Follow-up work usually targets one of three concerns only: survey/result shaping, health-metric cards, or medication/pharmacist comments.
- The new boundary reduces false starts when editing the admin integrated preview or tracing report payload regressions.

## New Entry Points

- `app/(admin)/admin/b2b-reports/_components/B2bIntegratedResultPreview.tsx`
  - Composition shell for the integrated preview.
- `app/(admin)/admin/b2b-reports/_lib/b2b-integrated-result-preview-model.ts`
  - Payload normalization for `SurveyResultPanel`, section-title map derivation, health metrics, and medication/comment data.
  - Reuses `components/b2b/report-summary/card-insights.ts` shared helper contract for answer decoding, percent normalization, and metric formatting.
  - Reuses `components/b2b/report-summary/detail-data-model.ts` for health metric rows and medication/pharmacist review data.
- `app/(admin)/admin/b2b-reports/_components/B2bIntegratedHealthMetricsSection.tsx`
  - Health-metric detail card section.
- `app/(admin)/admin/b2b-reports/_components/B2bIntegratedMedicationReviewSection.tsx`
  - Medication-history plus pharmacist comment section.

## Guard

- `npm run qa:b2b:integrated-result-preview-modules`
