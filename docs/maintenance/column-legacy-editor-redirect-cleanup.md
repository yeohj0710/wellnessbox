# Column Legacy Editor Redirect Cleanup

## Goal
- Keep `/column/editor` from looking like a second maintained editor surface.
- Ensure follow-up sessions start from the admin editor boundary immediately.

## Change
- Removed `app/column/editor/EditorClient.tsx`.
- Kept `app/column/editor/page.tsx` as a simple redirect to `/admin/column/editor`.
- Documented the redirect-only boundary in precheck and client-map docs.

## Follow-up rule
1. Treat `/admin/column/editor` as the only maintained editor UI.
2. If a lightweight dev-only markdown helper is ever needed again, add it outside the route tree or gate it explicitly; do not reintroduce a hidden route-local client beside the redirect page.

## QA
- `npm run qa:column-editor:legacy-redirect`
- `npm run qa:column-editor:controller-extraction`
- `npm run qa:column-editor:controller-subhooks`
