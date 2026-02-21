# NHIS Health Link (`/health-link`)

## Purpose

Single page flow for Hyphen NHIS integration:

1. Load link status
2. Start EASY auth (`init`)
3. Confirm auth (`sign`)
4. Fetch normalized data (`fetch`)

## Files

- `page.tsx`
  - Route entry and login/session bootstrap.
- `HealthLinkClient.tsx`
  - Page-level orchestration and section composition.
- `components/HealthLinkHeader.tsx`
  - Header and top status chips.
- `components/HealthLinkAuthSection.tsx`
  - Auth/init/sign form section and status notices.
- `components/HealthLinkResultSection.tsx`
  - Result metrics section, action toolbar integration, and table rendering.
- `components/HealthLinkCommon.tsx`
  - Reusable presentational blocks (step strip, metric cards, table panel).
- `components/HealthLinkFetchActions.tsx`
  - Detail/force-refresh action rows.
- `components/HealthLinkRawResponseSection.tsx`
  - Collapsible raw JSON response block.
- `components/HealthLinkStatusMeta.tsx`
  - Status-details card block for cache/cooldown/policy visibility.
- `useNhisHealthLink.ts`
  - Client workflow state + API calls.
- `fetchClientPolicy.ts`
  - Client-side low-cost target constants and fetch notice/cooldown copy policy.
- `types.ts`
  - API payload/response and normalized data types.
- `ui-types.ts`
  - UI-only type contracts (`PrimaryFlow`).
- `constants.ts`
  - UI steps, supported orgs, and static copy.
- `copy.ts`
  - Centralized UI text/copy tokens for fast wording updates.
- `view-model.ts`
  - Derived UI-state helpers (status chip, flow resolution, force-refresh hints).
- `utils.ts`
  - Formatting and data summarization helpers.
- `HealthLinkClient.module.css`
  - Page-specific styles.

## Security Rules

- Do not expose `User-Id`, `Hkey`, `Ekey`, `access_token` in client code.
- Keep `stepData` and `cookieData` server-side only.
- Route handlers must use `lib/server/route-auth.ts` guards.

## Behavioral Notes

- Current UX supports KAKAO-first EASY flow.
- `fetch` supports partial success handling so one endpoint failure does not drop all cards.
- Error code `C0012-001` should trigger a prerequisite guidance card.

## Cost Guardrails

- Summary fetch defaults to `targets: ["checkupOverview"]`.
- Detail fetch uses low-cost mode:
  - client requests `targets: ["checkupList", "checkupYearly"]` with `yearLimit: 1`
  - server clamps checkup list year scan to max 2 years
  - server caps yearly-detail calls to max 1 request per fetch
- If `detailKey` is missing, yearly endpoint is not called blindly.
- High-cost targets are blocked by default on the server:
  - blocked: `medical`, `medication`, `healthAge`
  - allowed: `checkupOverview`, `checkupList`, `checkupYearly`
  - blocked response: `errCd: NHIS_TARGET_POLICY_BLOCKED`
- Force refresh is available for manual troubleshooting, but:
  - server can replay recent cache first for cost protection
  - server cooldown limits rapid retries
  - UI reads `status.forceRefresh` and disables force-refresh buttons while cooldown remains
  - UI also disables force-refresh buttons when rolling budget remaining is `0`
  - in-flight dedupe merges concurrent same-key fresh requests
- Rolling fetch-budget limits are enforced server-side (non-cached fetch executions only):
  - default fresh budget: 6 per 24h
  - default force-refresh budget: 2 per 24h
  - budget status is exposed through `status.fetchBudget`

## Cache / Replay Protection

- `/api/health/nhis/fetch` stores response payloads in DB cache keyed by:
  - `appUserId + provider + requestHash`
  - requestHash includes identity hash + targets + date range + subject type + yearLimit
- Same user + same request returns cached payload and skips external Hyphen calls.
- Cache responses include metadata:
  - `cached: true|false`
  - `cache.source`
  - `cache.fetchedAt`, `cache.expiresAt`
  - `cache.source = db-force-guard` means a force-refresh request was replayed from recent cache.
- `unlink` clears both link credentials and cached fetch entries.

## Cache Tuning (Env)

- `HYPHEN_NHIS_SUMMARY_CACHE_TTL_MINUTES`
- `HYPHEN_NHIS_DETAIL_CACHE_TTL_MINUTES`
- `HYPHEN_NHIS_PARTIAL_CACHE_TTL_MINUTES`
- `HYPHEN_NHIS_FAILURE_CACHE_TTL_MINUTES`
- `HYPHEN_NHIS_CACHE_HASH_SALT`
- `HYPHEN_NHIS_FORCE_REFRESH_COOLDOWN_SECONDS`
- `HYPHEN_NHIS_FORCE_REFRESH_CACHE_GUARD_SECONDS` (`0` disables, default `1800`)
- `HYPHEN_NHIS_ENABLE_HIGH_COST_TARGETS` (`1` enables all targets, default is checkup-only)
- `HYPHEN_NHIS_FETCH_BUDGET_WINDOW_HOURS`
- `HYPHEN_NHIS_MAX_FRESH_FETCHES_PER_WINDOW`
- `HYPHEN_NHIS_MAX_FORCE_REFRESHES_PER_WINDOW`
- `HYPHEN_NHIS_FETCH_CACHE_EXPIRED_GRACE_DAYS`
- `HYPHEN_NHIS_REPORT_WINDOW_HOURS`
- `HYPHEN_NHIS_REPORT_TOP_USERS`
