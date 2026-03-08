# My-Data Section Modules

## Goal
- Keep `/my-data` follow-up edits local to the affected section instead of reopening one 500-line rendering file.
- Preserve the old `myDataPageSections.tsx` import path while making actual ownership explicit.

## Boundary
- `app/my-data/myDataPageSections.tsx`
  - Stable re-export surface only.
- `app/my-data/myDataPageOverviewSections.tsx`
  - Locked notice, header, metrics, account, session profile.
- `app/my-data/myDataPageOrderSection.tsx`
  - Orders accordion and item rows.
- `app/my-data/myDataPageResultSections.tsx`
  - Assessment and check-ai result accordions.
- `app/my-data/myDataPageChatSection.tsx`
  - Chat session list and message rendering.

## Follow-up rule
1. Import from `myDataPageSections.tsx` when you only need a stable public surface.
2. Edit the focused section module directly when changing a single my-data section.
3. Keep labels in `myDataPageLabels.ts`; do not move raw badge/status wording back into section files unless the wording is truly section-specific.

## QA
- `npm run qa:my-data:section-modules`
- `npm run qa:my-data:copy-localization`
