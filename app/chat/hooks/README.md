# Chat Hook Architecture (`app/chat/hooks`)

## Goal

Keep `useChat.ts` as orchestration-only and move heavy logic into focused modules.

## Current Modules

- `useChat.ts`
  - Main state machine for chat sessions, active session routing, and UI-facing callbacks.
- `useChat.api.ts`
  - API wrappers for `chat`, `chat/title`, `chat/suggest`, `chat/actions`, `chat/save`, and `chat/delete`.
- `useChat.browser.ts`
  - Browser-only side effects (navigation, cart open/clear, external link).
- `useChat.suggestions.ts`
  - Suggestion merge/dedupe/history utilities.
- `useChat.agentDecision.ts`
  - Action execution decision normalization and fallback action policy.
- `useChat.interactiveActions.ts`
  - Interactive action execution flows.
- `useChat.assessment.ts`
  - In-chat assessment question model and answer parsing.
- `useChat.evaluation.ts`
  - Quick/deep assessment scoring and result persistence calls.
- `useChat.cart-command.ts`
  - Cart command parsing + summary.
- `useChat.session.ts`
  - Session draft/merge/title defaults.
- `useChat.results.ts`
  - All-results payload normalization.
- `useChat.text.ts`, `useChat.stream.ts`, `useChat.recommendation.ts`
  - Text normalization, streaming reader, recommendation hydration.
- `useChat.assistant.ts`
  - Shared assistant stream flow (`/api/chat` request -> stream read -> sanitize -> recommendation hydration).
- `useChat.persistence.ts`
  - Session persistence helpers (persistable filter + idempotent save-once transport).
- `useChat.sessionState.ts`
  - Pure immutable session-state update helpers for title/message append/replace paths.
- `useChat.sendMessage.ts`
  - Outgoing turn preparation helper for `sendMessage` (trim/validate/session refs/message construction).
- `useChat.sendMessageFlow.ts`
  - Deterministic branch resolver for `sendMessage` (assessment/offline/action/cart/stream path selection).
- `useChat.streamTurn.ts`
  - Shared streamed-assistant turn runner used by both `sendMessage` and initial assistant bootstrap.
- `useChat.initialAssistant.ts`
  - Initial assistant bootstrap flow (empty session guard, offline fallback, stream start, error handling).
- `useChat.sessionActions.ts`
  - Session create/delete state transition helpers for `useChat.ts`.
- `useChat.finalizeFlow.ts`
  - Assistant turn finalization and title-generation flow helpers.
- `useChat.assessmentFlow.ts`
  - In-chat assessment bootstrap/input handling flow helpers.

## Refactor Rule

- New logic should be added to module files first.
- `useChat.ts` should only compose modules and manage React state/refs.
- If a function can run without React state setters, move it out.

## Next Safe Targets

1. Extract suggestion/action fetch orchestration into dedicated module with shared "active session" guard.
2. Split cart-command and action-decision handlers into isolated policy module.
3. Split large JSX consumers by moving prompt cards and metadata mappers into standalone components.
