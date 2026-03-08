# Column Editor Controller Extraction

## Why

`app/(admin)/admin/column/editor/EditorAdminClient.tsx` was still carrying the
entire column editor client lifecycle inline:

- post list/search/filter loading
- query-param based detail selection
- editor form/reset state
- save/publish/delete/dev-save mutations
- image paste/file upload and markdown insertion

That made the root client harder to read than necessary even though the UI
blocks had already been split into dedicated components.

## What changed

- Added `app/(admin)/admin/column/editor/_lib/use-column-editor-controller.ts`
  - owns list/detail/form state
  - owns mutation handlers and upload flow
  - returns `sidebarProps` / `workspaceProps` for the UI blocks
- Updated `app/(admin)/admin/column/editor/EditorAdminClient.tsx`
  - reduced to shell rendering, notices, overlay, and section composition

## Boundary

- `EditorAdminClient.tsx`
  - orchestration shell and layout composition only
- `use-column-editor-controller.ts`
  - router/search-param lifecycle
  - local editor state and operational handlers
  - upload-to-markdown insertion behavior
- `_components/*`
  - presentational sections for header/sidebar/workspace
- `_lib/api.ts`, `_lib/types.ts`, `_lib/utils.ts`
  - API contract, DTOs, and form helpers

## Follow-up guidance

- If behavior changes, start in `use-column-editor-controller.ts`.
- If layout or copy changes, start in `_components/`.
- If API shape changes, update `types.ts` then `api.ts` then the controller hook.

## Validation

- `npm run qa:column-editor:controller-extraction`
- `npm run lint`
- `npm run build`
