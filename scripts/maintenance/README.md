# NHIS Maintenance Scripts

This folder provides operational scripts for NHIS fetch cost/cache management.

## Commands

- `npm run maintenance:nhis-smoke-policy`
  - Fast invariant check for target/yearLimit/cooldown policy helpers.
- `npm run maintenance:nhis-report-attempts`
  - Reports recent fetch-attempt usage in a rolling window.
- `npm run maintenance:nhis-prune-attempts -- --dry-run`
  - Simulates deletion of old `HealthProviderFetchAttempt` rows.
- `npm run maintenance:nhis-prune-attempts`
  - Deletes old `HealthProviderFetchAttempt` rows.
- `npm run maintenance:nhis-prune-cache -- --dry-run`
  - Simulates deletion of expired `HealthProviderFetchCache` rows.
- `npm run maintenance:nhis-prune-cache`
  - Deletes expired `HealthProviderFetchCache` rows.

## Common Flow

1. Run policy smoke check.
2. Run attempts report for observability.
3. Run prune scripts in `--dry-run`.
4. Run prune scripts without `--dry-run` if results look correct.

## Migration Prerequisite

If NHIS maintenance tables are not migrated yet, scripts print `skipped` guidance and exit `0`.
Apply migrations before production maintenance:

`npx prisma migrate deploy`
