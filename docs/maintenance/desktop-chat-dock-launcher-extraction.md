# Desktop Chat Dock Launcher Extraction

## Goal
- Keep `components/chat/DesktopChatDock.tsx` focused on trigger-shell rendering instead of mixing boot/open lifecycle, viewport/footer offset state, route nudge visibility, and global dock events into one client component.
- Give follow-up sessions a single hook entry point for dock launch behavior.

## Boundary
- `components/chat/DesktopChatDock.tsx`
  - Route-aware dock trigger shell, page-agent context wiring, and route-nudge JSX composition.
- `components/chat/useDesktopChatDockLauncher.ts`
  - Lazy dock boot and pending-open lifecycle.
  - Viewport width and footer cart bar offset tracking.
  - Route nudge visibility, dismiss, and prompt-launch behavior.
  - Escape key handling plus `wb:chat-open-dock`, `wb:chat-close-dock`, and `openCart` listeners.

## Follow-up rule
1. Change dock open/close or route-nudge behavior in `useDesktopChatDockLauncher.ts` first.
2. Keep prompt consumption and session-layer behavior in `useDesktopChatDockPanelShell.ts`.
3. Keep `DesktopChatDock.tsx` limited to context derivation and trigger/nudge/panel composition.

## QA
- `npm run qa:chat:dock-launcher`
