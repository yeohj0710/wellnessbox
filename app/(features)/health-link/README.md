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
  - UI shell and three-section workflow rendering.
- `useNhisHealthLink.ts`
  - Client workflow state + API calls.
- `types.ts`
  - API payload/response and normalized data types.
- `constants.ts`
  - UI steps, supported orgs, and static copy.
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
