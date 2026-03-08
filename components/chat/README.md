# Chat Dock UI Modules (`components/chat`)

## Desktop Dock Composition

- `DesktopChatDock.tsx`
  - Dock trigger shell, page-agent context wiring, and route-nudge composition.
- `useDesktopChatDockLauncher.ts`
  - Dock boot/open lifecycle, route-nudge visibility, viewport/footer offset state, and global open/close event wiring.
- `DesktopChatDockPanel.tsx`
  - Dock shell composition (header/feed/input/session layer/profile modal).
- `useDesktopChatDockPanelShell.ts`
  - Dock panel shell state, prompt bootstrap effect, inert/focus cleanup, and session-layer handlers.
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
  - Stable export surface for shared dock layout helpers.
- `DesktopChatDock.layout.geometry.ts`
  - Geometry math, resize-edge contracts, scroll-chain helpers, and cursor primitives.
- `DesktopChatDock.layout.storage.ts`
  - Prompt/nudge persistence, layout event helpers, and dock size/position storage.

## Maintenance Notes

- Keep `DesktopChatDock.layout.ts` limited to stable re-exports.
- Keep geometry math, scroll-chain helpers, and resize cursor helpers in `DesktopChatDock.layout.geometry.ts`.
- Keep storage keys, prompt/nudge persistence, and layout event helpers in `DesktopChatDock.layout.storage.ts`.
- Keep dock boot/open lifecycle, route nudge visibility, and global launcher events in `useDesktopChatDockLauncher.ts`.
- Keep dock prompt consumption, inert/focus effects, and session prompt/confirm handlers in `useDesktopChatDockPanelShell.ts`.
- Keep pointer drag/resize orchestration in `useDesktopChatDockPointer.ts`.
- Keep `DesktopChatDockPanel.tsx` focused on composition and wiring.
- Extract reusable presentation blocks before adding new large conditional JSX sections.

## Next Safe Targets

1. Add a Playwright smoke test for dock open -> send -> close.
2. If layout state grows again, split effect-heavy viewport/layout emit work from style derivation inside `useDesktopChatDockLayout.ts`.
3. If feed logic grows, split loading rows and assistant message row presenters.
