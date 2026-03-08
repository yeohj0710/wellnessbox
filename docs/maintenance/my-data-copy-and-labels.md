# My-Data Copy And Labels

## Goal
- Remove English-first badges and raw technical status labels from the `/my-data` surface.
- Centralize user-facing badge/role/status wording so future edits stay Korean-first by default.
- Keep the focused my-data section modules on layout/rendering only, and keep label formatting inside `myDataPageLabels.ts`.

## Scope
- New helper:
  - `app/my-data/myDataPageLabels.ts`
- Updated sections:
  - `app/my-data/myDataPageSections.tsx`
  - `app/my-data/myDataPageOverviewSections.tsx`
  - `app/my-data/myDataPageChatSection.tsx`

## Ownership
- `myDataPageSections.tsx`
  - stable export surface for section modules
- `myDataPageOverviewSections.tsx`
  - header/account/profile badge placement
- `myDataPageChatSection.tsx`
  - chat scope/status/role badge placement
- `myDataPageLabels.ts`
  - user-facing badge text
  - chat scope/status/role labels
  - technical ID summary phrasing

## Validation
1. `npm run audit:encoding`
2. `npm run qa:my-data:copy-localization`
3. `npm run lint`
4. `npm run build`
