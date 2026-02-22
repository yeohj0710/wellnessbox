# Chat Dock UI Modules (`components/chat`)

## Desktop Dock Composition

- `DesktopChatDock.tsx`
  - Dock trigger, open/close state, route-aware prompt bootstrap.
- `DesktopChatDockPanel.tsx`
  - Dock shell composition (header/feed/input/session layer/profile modal).
- `useDesktopChatDockLayout.ts`
  - Drag/resize lifecycle, viewport clamping, layout emit, and panel inline style state.
- `useDesktopChatDockPointer.ts`
  - Low-level pointer interaction orchestrator (resize/drag move loop + commit/persist).
- `DesktopChatDockPanelHeader.tsx`
  - Dock header UI (title, session toggle, top actions).
- `DesktopChatDockResizeOverlay.tsx`
  - Resize hint bubble and edge/corner resize handles.
- `DesktopChatDockPanel.loading.ts`
  - Assistant loading metadata mapper.
- `DesktopChatDockMessageFeed.tsx`
  - Message feed area, profile banner, bootstrap skeleton, and capability cards.
- `DesktopChatDockSessionLayer.tsx`
  - Session list layer (select/rename/delete/new).
- `DesktopChatDock.layout.ts`
  - Geometry/storage/event/scroll helper primitives.

## Maintenance Notes

- Keep geometry math and storage keys in `DesktopChatDock.layout.ts`.
- Keep pointer drag/resize orchestration in `useDesktopChatDockPointer.ts`.
- Keep `DesktopChatDockPanel.tsx` focused on composition and wiring.
- Extract reusable presentation blocks before adding new large conditional JSX sections.

## Next Safe Targets

1. Add a Playwright smoke test for dock open -> send -> close.
2. If feed logic grows, split loading rows and assistant message row presenters.
3. Consider extracting session-panel prompt/confirm handlers when session actions expand.
