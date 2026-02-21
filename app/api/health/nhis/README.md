# NHIS API Notes (`/api/health/nhis/*`)

## Routes

- `POST /api/health/nhis/init`
  - Starts EASY auth (kakao only in current deployment).
- `POST /api/health/nhis/sign`
  - Completes EASY auth and persists cookie/session artifacts.
- `GET /api/health/nhis/status`
  - Returns link status for current signed-in user.
  - Includes cache metrics (`totalEntries`, `validEntries`, latest cache timestamps/hit count).
  - Includes force-refresh cooldown state (`available`, `remainingSeconds`, `availableAt`).
  - Includes target policy state (`highCostTargetsEnabled`, `allowedTargets`).
- `POST /api/health/nhis/fetch`
  - Fetches NHIS data with cost guard + DB cache replay protection.
  - Route handles auth/cache/persistence orchestration.
  - Provider fanout and normalization run in `lib/server/hyphen/fetch-executor.ts`.
  - Cache replay + persistence helpers are isolated in `lib/server/hyphen/fetch-route-cache.ts`.
  - Request policy helpers are isolated in `lib/server/hyphen/fetch-request-policy.ts`.
  - Fetch flow relies on persisted linked credentials only; it does not consume pending easy-auth session state.
- `POST /api/health/nhis/unlink`
  - Clears link info and fetch cache.

## Fetch Request

```json
{
  "targets": ["checkupOverview"],
  "yearLimit": 1,
  "forceRefresh": false
}
```

- `targets` optional; default is `["checkupOverview"]`.
- `yearLimit` optional; server clamps to policy range.
- `forceRefresh` optional; when `true`, server attempts fresh fetch but may reuse recent cache under cost-guard policy.

## Fetch Cost Guardrails

- High-cost targets are blocked by default (low-cost policy):
  - blocked by default: `medical`, `medication`, `healthAge`
  - allowed by default: `checkupOverview`, `checkupList`, `checkupYearly`
  - blocked request returns `400` with `errCd: NHIS_TARGET_POLICY_BLOCKED`
- Detailed fetch policy is intentionally strict:
  - list year scan max 2 years per request
  - yearly detail max 1 call per request
  - no blind yearly call when `detailKey` is missing
  - `yearLimit` is canonicalized for summary-only requests to avoid cache-key drift
- Force refresh policy:
  - `forceRefresh: true` does not always guarantee a paid fetch
  - recent successful cache entries can be replayed first for cost protection
  - server enforces cooldown (`HYPHEN_NHIS_FORCE_REFRESH_COOLDOWN_SECONDS`)
  - server enforces recent-cache guard (`HYPHEN_NHIS_FORCE_REFRESH_CACHE_GUARD_SECONDS`)
  - cooldown basis uses latest non-cached fetch attempt (success/failure) to block repeated paid retries
  - when blocked, returns `429` with `Retry-After`
- Fresh-fetch budget policy (cache-miss / force-refresh only):
  - server records every non-cached fetch execution in `HealthProviderFetchAttempt`
  - server enforces rolling-window limits before external provider fanout
  - default limits:
    - fresh fetches: 6 per 24h
    - force refreshes: 2 per 24h
  - when blocked, returns `429` with:
    - `errCd: NHIS_FETCH_DAILY_LIMIT` or `NHIS_FORCE_REFRESH_DAILY_LIMIT`
    - `retryAfterSec`
    - `budget` snapshot (`windowHours`, `fresh`, `forceRefresh`)
- Init/Sign duplicate-call protection:
  - `init` reuses existing pending step state for same identity instead of re-calling provider
  - `init`/`sign` use in-flight dedupe to collapse concurrent duplicate requests
  - `sign` short-circuits when already linked for same identity
- Cache-first behavior:
  - same `appUser + identity + request params` => DB cached payload replay
  - fallback: when request hash misses due date-window drift, same `appUser + identity + targets + yearLimit + subjectType` can still replay valid cached success payload
  - cached response includes `cached` and `cache` metadata
  - `cache.source` values:
    - `db`: exact request-hash hit
    - `db-identity`: identity-level fallback hit
    - `db-force-guard`: force-refresh request replayed from recent cache by cost guard
    - `fresh`: provider fanout executed
- In-flight dedupe:
  - concurrent same request-hash fresh requests are merged in-process to one provider fanout
  - dedupe key does not split by `forceRefresh`, reducing duplicate paid calls under concurrent clicks

## Cache Model

- Table: `HealthProviderFetchCache`
- Key: `(appUserId, provider, requestHash)` unique
- Identity source:
  - priority: pending auth PII hash -> stored hash -> app user fallback hash
- Table: `HealthProviderFetchAttempt`
  - stores non-cached fetch executions for rolling-window budget enforcement
  - indexed by `(appUserId, provider, createdAt)` and force-refresh dimension

## Cost Policy Env

- `HYPHEN_NHIS_FORCE_REFRESH_COOLDOWN_SECONDS`
- `HYPHEN_NHIS_FORCE_REFRESH_CACHE_GUARD_SECONDS` (default `1800`, set `0` to disable)
- `HYPHEN_NHIS_ENABLE_HIGH_COST_TARGETS` (`1` enables all targets, default is checkup-only)
- `HYPHEN_NHIS_FETCH_BUDGET_WINDOW_HOURS` (default `24`)
- `HYPHEN_NHIS_MAX_FRESH_FETCHES_PER_WINDOW` (default `6`)
- `HYPHEN_NHIS_MAX_FORCE_REFRESHES_PER_WINDOW` (default `2`)
- `HYPHEN_NHIS_FETCH_ATTEMPT_RETENTION_DAYS` (maintenance script default `90`)
- `HYPHEN_NHIS_FETCH_CACHE_EXPIRED_GRACE_DAYS` (cache prune script default `7`)
- `HYPHEN_NHIS_REPORT_WINDOW_HOURS` (attempt report script default `24`)
- `HYPHEN_NHIS_REPORT_TOP_USERS` (attempt report script default `20`)

## Maintenance

- Script bundle reference: `scripts/maintenance/README.md`
- Prune old fetch-attempt logs:
  - dry-run: `npm run maintenance:nhis-prune-attempts -- --dry-run`
  - execute: `npm run maintenance:nhis-prune-attempts`
  - custom retention: `npm run maintenance:nhis-prune-attempts -- --days=30`
- Prune expired fetch-cache rows:
  - dry-run: `npm run maintenance:nhis-prune-cache -- --dry-run`
  - execute: `npm run maintenance:nhis-prune-cache`
  - custom grace days: `npm run maintenance:nhis-prune-cache -- --grace-days=3`
- Report recent fetch-attempt usage:
  - default window report: `npm run maintenance:nhis-report-attempts`
  - custom window: `npm run maintenance:nhis-report-attempts -- --window-hours=72 --top-users=30`
- Smoke-check request policy invariants:
  - `npm run maintenance:nhis-smoke-policy`

## Troubleshooting

- If billed calls are higher than expected, verify:
  1. request `targets` from client
  2. `forceRefresh` usage
  3. cooldown rejection (`429`, `Retry-After`)
  4. status cooldown state (`status.forceRefresh.remainingSeconds`)
  5. target policy block (`NHIS_TARGET_POLICY_BLOCKED`)
  6. cache metadata in response (`cached`, `cache.source`)
  7. fetch budget block (`NHIS_FETCH_DAILY_LIMIT`, `NHIS_FORCE_REFRESH_DAILY_LIMIT`)
  8. status budget snapshot (`status.fetchBudget`)
  9. DB migration applied for fetch cache/attempt tables
