# Client ID stabilization and audit notes

## Root cause summary
- The browser generated client IDs independently in multiple places (`app/assess/page.tsx`, `app/check-ai/page.tsx`, `app/chat/utils.ts`) using `Math.random()` + timestamp and only saved them to `localStorage`.
- No server-set cookie or header was issued, and `getClientIdFromRequest` only looked for headers or a `wb_cid` cookie that was never written anywhere. API routes also trusted arbitrary `clientId` payloads, so browsers without the cookie (or crawlers sending random IDs) kept minting new `Client` rows.
- Crawlers or new browsers therefore produced fresh IDs repeatedly, and every API call that carried those ad-hoc IDs triggered `ensureClient` upserts, inflating `Client` rows and scattering related records.

## New client ID flow
- Middleware now assigns a durable `wb_cid` cookie (1 year, Lax) for non-bot HTML traffic so the server always receives the same ID, and API routes now backfill the cookie when requests only carry the ID in headers/body.
- Browser helpers in `lib/client-id.ts` read or create the ID once, persist it to both cookie and `localStorage`, and refresh the cookie if needed. All client surfaces reuse this helper.
- Server-side `ensureClient` skips bot user agents, avoids needless writes (10m throttle, only when fields change), and creates clients only when missing.

## Diagnostics
- Run `npm run audit:clients` to print creation trends, user-agent leaders, ID length distribution, last-seen patterns, and linkage ratios (AppUser/UserProfile vs Client). The script uses Prisma only.

## Verification checklist
- Using the same browser, multiple visits and interactions should keep `wb_cid` unchanged and reuse the same `Client` row.
- Opening a private/incognito window should create a new `wb_cid` and a new `Client` row only after the first interaction.
- Assessment, Check-AI, and chat requests should all send the same `clientId`, and the corresponding `AssessmentResult`/`CheckAiResult`/`ChatSession` rows should share it.
- Requests from obvious bots or without HTML acceptance should not mint a client cookie; `ensureClient` should ignore bot user agents if invoked.
