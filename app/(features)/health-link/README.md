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
  - Result stage orchestrator (loading/notice/content composition).
- `components/HealthLinkResultContent.tsx`
  - Result content composition (`summary hero -> checkup -> optional medication`).
- `components/HealthLinkSummaryHero.tsx`
  - Single high-priority summary block for mobile users.
- `components/HealthLinkCheckupSection.tsx`
  - Checkup tabs + prioritized rows + expand/collapse handling.
- `components/HealthLinkMedicationOptionalSection.tsx`
  - Optional collapsed medication detail block.
- `components/HealthLinkResultLoadingPanel.tsx`
  - Long-fetch loading panel with progress + skeleton UI.
- `components/HealthLinkResultFailureNotice.tsx`
  - Soft failure notice/detail block for partial-fetch scenarios.
- `components/HealthLinkResultSection.helpers.tsx`
  - Result section helper types and pure rendering/normalization helpers.
- `components/HealthLinkCommon.tsx`
  - Reusable presentational blocks (step strip, metric cards, table panel).
- `components/HealthLinkFetchActions.tsx`
  - Primary action row + collapsed secondary options.
- `components/HealthLinkRawResponseSection.tsx`
  - Collapsible raw JSON response block.
- `useNhisHealthLink.ts`
  - Client workflow state + API calls.
- `useNhisActionRequest.ts`
  - Shared request executor hook (timeout/error/session-expiry handling).
- `useNhisSummaryAutoFetch.ts`
  - Auto-fetch side effects for linked sessions and budget-block synchronization.
- `useNhisHealthLink.helpers.ts`
  - Shared validation/notice/budget helper logic for the client hook.
- `request-utils.ts`
  - Shared request timeout/error/budget message helpers for hook logic.
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
- `utils-health-metric-tone.ts`
  - 검진 수치 판정용 텍스트/범위 규칙과 수치 파싱 유틸.
- `HealthLinkClient.module.css`
  - Page-specific styles.
- `MAINTENANCE.md`
  - Quick handoff guide for future engineers/agents.

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
- result stage prioritizes one summary hero card before detailed lists.
- collapsed checkup preview avoids immediately repeating metrics already shown in summary insights (`더 보기`에서 전체 확인 가능).
- secondary actions (e.g. identity switch) are collapsed under optional controls.
- `fetch` supports partial success handling so one endpoint failure does not drop all cards.
- Error code `C0012-001` should trigger a prerequisite guidance card.
- Successful fetch payloads include `normalized.aiSummary` (best-effort OpenAI + fallback).
- `normalized.aiSummary.metricInsights` may be returned and is used for plain-language key insights.
- AI summary generation must never break or block the core fetch UX.

## Cost Guardrails

- Summary fetch defaults to `targets: ["checkupOverview", "medication"]`.
- Summary fetch provider fanout is fixed to:
  - 1x `checkupOverview`
  - 1x `medication`
  - no default `medical` call
- Normalized summary payload is slimmed for UI:
  - latest checkup batch only
  - latest medication 3 rows only
- Current client UX only triggers summary fetch.
  - no visible detail-fetch or force-refresh controls in `/health-link`
  - this keeps default user flow on the low-cost profile
- Detail fetch is treated as high-cost mode:
  - `checkupList` / `checkupYearly` are blocked unless `HYPHEN_NHIS_ENABLE_HIGH_COST_TARGETS=1`
  - when enabled, `yearLimit` still clamps to max 1 year
  - server caps yearly-detail calls to max 1 request per fetch
- If `detailKey` is missing, yearly endpoint is not called blindly.
- High-cost targets are blocked by default on the server:
  - blocked: `medical`, `healthAge`, `checkupList`, `checkupYearly`
  - allowed: `checkupOverview`, `medication`
  - blocked response: `errCd: NHIS_TARGET_POLICY_BLOCKED`
- Force refresh is intentionally hidden from default UI and reserved for internal troubleshooting paths:
  - server can replay recent cache first for cost protection
  - server cooldown limits rapid retries
  - rolling budget still blocks overuse (`status.fetchBudget`)
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
