# NHIS Fetch Slim Runbook (Checkup 1 + Medication 3)

## Goal

- Always request low-cost targets only:
  - `checkupOverview` (검진 요약)
  - `medication` (투약 정보)
- Do not request high-cost targets in default flow:
  - `medical`, `healthAge`, `checkupList`, `checkupYearly`
- Shape normalized payload for `/health-link` to:
  - latest checkup batch only
  - latest medication 3 rows only

## External References

- Hyphen NHIS API page (product seq 79):
  - `https://hyphen.im/product-api/view?seq=79#product-api-specification`
- Hyphen free testbed notice (benefit seq 10):
  - `https://hyphen.im/benefit/view?seq=10`
  - Notice text says free test support started on **November 1, 2022** with **100/day + 100/month** test range.

## Implemented In Code

- `lib/server/hyphen/fetch-contract.ts`
  - default targets now include both `checkupOverview` + `medication`.
- `lib/server/hyphen/fetch-executor.ts`
  - summary fetch path executes:
    - one `checkupOverview` call
    - one `medication` call
  - removed multi-window medication probe fanout (single medication call).
- `lib/server/hyphen/normalize.ts`
  - trims normalized medication rows to latest 3.
  - trims checkup overview rows to latest checkup batch.

## Local Smoke Test (No External API Required)

- Command:
  - `npm run maintenance:nhis-smoke-fetch-slim`
- What it validates:
  - default target set is `["checkupOverview", "medication"]`
  - normalized medication list length is `3`
  - checkup overview is narrowed to latest batch

## Manual Testbed Verification (External)

1. Open Hyphen testbed and run linked NHIS auth flow.
2. In WellnessBox `/health-link`, run one summary fetch.
3. Validate response shape:
   - `data.normalized.checkup.overview` belongs to latest checkup batch only.
   - `data.normalized.medication.list.length <= 3`.
4. Validate call policy:
   - no call for `medical` target in default flow.
   - no call for `checkupList` / `checkupYearly` unless explicitly requested in high-cost mode.
5. Validate cache/cost behavior:
   - repeated same request should return cached response (`cached: true`) when available.
   - verify `cache.source` in fetch response.

## Recommended Validation Commands

- `npm run audit:encoding`
- `npm run maintenance:nhis-smoke-policy`
- `npm run maintenance:nhis-smoke-fetch-slim`
- `npm run maintenance:nhis-smoke-ai-summary`
- `npm run lint`
- `npm run build`

