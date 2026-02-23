# NHIS Health Link (`/health-link`)

## Purpose

Single page flow for Hyphen NHIS integration:

1. Load link status
2. Start EASY auth (`init`)
3. Confirm auth (`sign`)
4. Auto-fetch latest checkup + medication summary (`fetch`)

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
  - Utility barrel export used by client/components.
- `utils-format.ts`
  - Formatting, labels, table-column selection, and JSON preview helpers.
- `utils-session.ts`
  - Session-expiry 판단 및 fetch 실패 메시지 정규화 로직.
- `utils-health-data.ts`
  - 검진/투약 행 요약, 최신 검진 메타 추출, 지표 톤 판별 로직.
- `HealthLinkClient.module.css`
  - Page-specific styles.

## Security Rules

- Do not expose `User-Id`, `Hkey`, `Ekey`, `access_token` in client code.
- Keep `stepData` and `cookieData` server-side only.
- Route handlers must use `lib/server/route-auth.ts` guards.

## Behavioral Notes

- 카카오 로그인 없이도 본인정보 입력 후 바로 EASY 연동을 시작할 수 있습니다.
- 카카오 로그인은 선택이며, 다기기 기록 복원 용도로만 권장됩니다.
- Same identity + existing DB cache can short-circuit `init` to immediate relink (`nextStep: fetch`).
- After `sign` success, the client immediately runs summary fetch (no extra middle step click).
- linked 상태로 페이지에 진입하면 최신 요약 조회를 자동으로 1회 실행합니다.
- `fetch` supports partial success handling so one endpoint failure does not drop all cards.
- Error code `C0012-001` should trigger a prerequisite guidance card.

## Cost Guardrails

- Summary fetch defaults to `targets: ["checkupOverview", "medication"]`.
- Detail fetch uses low-cost mode:
  - client requests `targets: ["checkupList", "checkupYearly"]` with `yearLimit: 1`
  - server clamps checkup list year scan to max 2 years
  - server caps yearly-detail calls to max 1 request per fetch
- If `detailKey` is missing, yearly endpoint is not called blindly.
- High-cost targets are blocked by default on the server:
  - blocked: `medical`, `healthAge`
  - allowed: `checkupOverview`, `medication`, `checkupList`, `checkupYearly`
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
  - `cache.source = db-history` means latest identity cache was replayed even after TTL expiry.
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
- `HYPHEN_NHIS_ENABLE_HIGH_COST_TARGETS` (`1` enables all targets, default is checkup+medication low-cost profile)
- `HYPHEN_NHIS_FETCH_BUDGET_WINDOW_HOURS`
- `HYPHEN_NHIS_MAX_FRESH_FETCHES_PER_WINDOW`
- `HYPHEN_NHIS_MAX_FORCE_REFRESHES_PER_WINDOW`
- `HYPHEN_NHIS_FETCH_CACHE_EXPIRED_GRACE_DAYS`
- `HYPHEN_NHIS_REPORT_WINDOW_HOURS`
- `HYPHEN_NHIS_REPORT_TOP_USERS`
