# Desktop Chat Dock Layout Modules

## Goal
- Keep `components/chat/DesktopChatDock.layout.ts` as a stable import surface for dock consumers instead of mixing geometry math, scroll-chain helpers, storage keys, and route-nudge persistence in one file.
- Make follow-up sessions read either dock frame math or dock storage/event helpers without reopening the whole layout surface.

## Boundary
- `components/chat/DesktopChatDock.layout.ts`
  - Stable export surface for existing consumers.
- `components/chat/DesktopChatDock.layout.geometry.ts`
  - Dock size/position clamping.
  - Drag/resize edge types and cursor helpers.
  - Scroll-chain and focus-blur primitives.
- `components/chat/DesktopChatDock.layout.storage.ts`
  - Dock size/position persistence.
  - Pending prompt queue and route-nudge suppression helpers.
  - Footer cart bar offset parsing and dock layout event helpers.

## Follow-up rule
1. Add new geometry, drag, resize, or scroll helpers in `DesktopChatDock.layout.geometry.ts`.
2. Add new persistence, prompt, or layout-event helpers in `DesktopChatDock.layout.storage.ts`.
3. Keep `DesktopChatDock.layout.ts` limited to explicit re-exports so current consumers can stay on one import path.

## QA
- `npm run qa:chat:dock-layout-modules`
