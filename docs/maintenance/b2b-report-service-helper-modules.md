# B2B Report Service Helper Modules

`lib/b2b/report-service.ts` keeps report lifecycle orchestration. Shared payload/layout inspection helpers now live in a separate module so regeneration rules and export flow are easier to scan.

## File roles

- `lib/b2b/report-service.ts`
  - Owns report creation, latest-report regeneration policy, stale-source checks, and export orchestration.
  - Keeps `shouldRegenerateEmptyMedicationReport` in the service layer because it combines DB lookup with payload inspection.
- `lib/b2b/report-service.helpers.ts`
  - Owns JSON-safe serialization helpers.
  - Owns stored layout parsing/version checks.
  - Owns report payload medication-row inspection and raw snapshot treatment-row inspection helpers.
  - Owns report history-per-period env limit parsing.

## Change guide

- Report regeneration policy or DB query changes:
  - `lib/b2b/report-service.ts`
- Layout payload parsing/version checks:
  - `lib/b2b/report-service.helpers.ts`
- Medication recovery detection from stored payload/snapshot envelopes:
  - `lib/b2b/report-service.helpers.ts`

## Validation

- `npm run qa:b2b:report-service-helpers`
- `npm run qa:medication:resilience`
- `npm run audit:encoding`
- `npm run lint`
- `npm run build`
