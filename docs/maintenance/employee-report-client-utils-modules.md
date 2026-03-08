# Employee Report Client-Utils Modules

## Goal
- Keep `/employee-report` follow-up work readable without reopening a 600+ line utility file.
- Preserve the old `client-utils.ts` import path as a stable facade while making actual ownership explicit.

## Boundary
- `app/(features)/employee-report/_lib/client-utils.ts`
  - Stable facade only. Re-export surface for legacy imports and QA runtime requires.
- `app/(features)/employee-report/_lib/client-utils.identity.ts`
  - Identity normalization, localStorage persistence, stored-identity parsing, CTA label resolution.
- `app/(features)/employee-report/_lib/client-utils.request.ts`
  - `ApiRequestError`, abort/timeout handling, `requestJson`.
- `app/(features)/employee-report/_lib/client-utils.guidance.ts`
  - Sync notice/guidance, cooldown resolution, medication status messaging, layout DSL parsing.
- `app/(features)/employee-report/_lib/client-utils.pdf.ts`
  - Raw PDF download and server PDF engine fallback detection.
- `app/(features)/employee-report/_lib/client-utils.format.ts`
  - Shared date/time display helpers.

## Follow-up rule
1. New feature code should import from the focused module first.
2. Keep `client-utils.ts` thin; do not reintroduce implementation bodies there.
3. If a new concern appears, add another focused module and re-export it from the facade only if compatibility is required.

## QA
- `npm run qa:employee-report:client-utils-modules`
- `npm run qa:employee-report:auth-ux`
- `npm run qa:employee-report:sync-notice`
