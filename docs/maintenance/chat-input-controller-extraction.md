# Chat Input Controller Extraction

## Summary

- Extracted local `ChatInput` behavior into `app/chat/components/useChatInputController.ts`.
- Split coachmark, hint pill, and quick-action tray markup into `app/chat/components/ChatInputActionAssist.tsx`.
- Moved the reusable prop contract into `app/chat/components/chatInput.types.ts`.

## Why

- The previous `ChatInput.tsx` mixed textarea sizing, coachmark/localStorage behavior, quick-action tray state, and the actual input shell.
- Follow-up sessions usually need either the local controller behavior or the rendered assist surfaces, not both at once.
- This split keeps the root input component focused on the message box shell shared by `/chat` and the desktop dock panel.

## New Entry Points

- `app/chat/components/ChatInput.tsx`
  - Input shell composition and textarea/send/stop wiring.
- `app/chat/components/useChatInputController.ts`
  - Textarea sizing, assist surface state, unified-action composition, and coachmark persistence.
- `app/chat/components/ChatInputActionAssist.tsx`
  - Coachmark bubble, hint pill, and quick-action tray UI.
- `app/chat/components/chatInput.types.ts`
  - Shared prop contract for the shell/controller boundary.

## Guard

- `npm run qa:chat:input-controller`
