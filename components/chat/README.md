# Chat Dock UI Modules (`components/chat`)

## Desktop Dock Composition

- `DesktopChatDock.tsx`
  - Dock trigger, open/close state, route-aware prompt bootstrapping.
- `DesktopChatDockPanel.tsx`
  - Dock shell + message area + input binding + drag/resize wiring.
- `DesktopChatDockSessionLayer.tsx`
  - Session list drawer (select/rename/delete/new).
- `DesktopChatDock.layout.ts`
  - Layout math: clamp/load/save size and position, resize edge helpers, scroll lock utilities.

## Maintenance Notes

- Keep drag/resize math only in `DesktopChatDock.layout.ts`.
- Keep `DesktopChatDockPanel.tsx` focused on composition, not low-level utility logic.
- Put reusable presentation sections in dedicated files before adding new conditional JSX branches.

## Next Safe Targets

1. Split dock header into `DesktopChatDockHeader.tsx`.
2. Split message feed block into `DesktopChatDockFeed.tsx`.
3. Move resize hint UI into a small presentational component.
