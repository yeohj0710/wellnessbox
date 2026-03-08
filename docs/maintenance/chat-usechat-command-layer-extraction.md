# Chat useChat Command Layer Extraction

## Goal
- Keep `app/chat/hooks/useChat.ts` focused on hook-level state/effect wiring and derived state.
- Move UI-facing command assembly into a single boundary so follow-up sessions can inspect handler orchestration without re-reading every bootstrap/effect in `useChat.ts`.

## Boundary
- `app/chat/hooks/useChat.ts`
  - Chat state, refs, bootstrap effects, derived context, scroll effects, and return shape.
- `app/chat/hooks/useChat.commandLayer.ts`
  - `clearFollowups`, assistant-message updates, action-memory writes, and assembly of:
    - assistant-turn handlers
    - in-chat assessment handlers
    - interactive commands
    - message-flow handlers
    - session commands

## Follow-up rule
1. If a change affects `sendMessage`, interactive actions, title generation, or session CRUD wiring, start in `useChat.commandLayer.ts`.
2. If a change affects bootstrap data, derived payloads, or scroll/init effects, start in `useChat.ts`.
3. Keep leaf logic in the existing focused modules (`useChat.assistantTurnHandlers.ts`, `useChat.messageFlowHandlers.ts`, `useChat.sessionCommands.ts`, etc.) instead of moving it back inline.

## QA
- `npm run qa:chat:command-layer`
