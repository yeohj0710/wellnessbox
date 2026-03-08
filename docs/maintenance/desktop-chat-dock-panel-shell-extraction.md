# Desktop Chat Dock Panel Shell Extraction

## Goal
- Keep `components/chat/DesktopChatDockPanel.tsx` as a composition shell instead of mixing dock prompt effects, focus cleanup, scroll-chain guard logic, and session-layer handlers into one client component.
- Give follow-up sessions a single hook entry point for dock-panel behavior changes.

## Boundary
- `components/chat/DesktopChatDockPanel.tsx`
  - `useChat` orchestration plus header/feed/input/session-layer/profile-modal wiring only.
- `components/chat/useDesktopChatDockPanelShell.ts`
  - Pending dock prompt consumption.
  - Panel/session-layer `inert` and blur cleanup.
  - Open-state scroll-to-bottom sync.
  - Wheel scroll-chain guard inside the dock boundary.
  - Session-layer open/close/select/create/rename/delete handlers.

## Follow-up rule
1. Change dock panel behavior in `useDesktopChatDockPanelShell.ts` first.
2. Keep drag/resize behavior in `useDesktopChatDockLayout.ts` and `useDesktopChatDockPointer.ts`.
3. Keep `DesktopChatDockPanel.tsx` limited to prop wiring and shell composition.

## QA
- `npm run qa:chat:dock-panel-shell`
