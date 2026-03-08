# Column Editor Controller Subhooks

## Why

After the first extraction, `use-column-editor-controller.ts` still held two
separate operational responsibilities inline:

- post mutation handlers (`save`, `publish`, `delete`, `dev-save`)
- markdown image-upload flow (`paste`, `file-select`, cursor insertion)

Those concerns were stable enough to extract further, and doing so makes the
column editor easier to navigate in follow-up sessions.

## What changed

- Added `app/(admin)/admin/column/editor/_lib/use-column-editor-post-actions.ts`
  - owns upsert payload derivation and mutation handlers
- Added `app/(admin)/admin/column/editor/_lib/use-column-editor-markdown-media.ts`
  - owns textarea/file-input refs and markdown upload insertion flow
- Updated `app/(admin)/admin/column/editor/_lib/use-column-editor-controller.ts`
  - now focuses on list/detail selection state, form state, and subhook wiring

## Boundary

- `use-column-editor-controller.ts`
  - state orchestration and UI prop composition
- `use-column-editor-post-actions.ts`
  - mutation buttons and publish-block logic
- `use-column-editor-markdown-media.ts`
  - image upload/paste and markdown insertion

## Validation

- `npm run qa:column-editor:controller-extraction`
- `npm run qa:column-editor:controller-subhooks`
- `npm run lint`
- `npm run build`
