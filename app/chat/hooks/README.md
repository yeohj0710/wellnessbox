# Chat Hook Architecture (`app/chat/hooks`)

## Goal

Keep `useChat.ts` as orchestration-only and move heavy logic into focused modules.

## Current Modules

- `useChat.ts`
  - Main state machine for chat sessions, active session routing, and UI-facing callbacks.
- `useChat.api.ts`
  - API wrappers for `chat`, `chat/title`, `chat/suggest`, and `chat/actions`.
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

## Refactor Rule

- New logic should be added to module files first.
- `useChat.ts` should only compose modules and manage React state/refs.
- If a function can run without React state setters, move it out.

## Next Safe Targets

1. Extract initial-message flow (`startInitialAssistantMessage`) into a dedicated module.
2. Extract session CRUD persistence (`saveChatOnce`, delete/rename helpers).
3. Split large JSX consumers by moving prompt cards and metadata mappers into standalone components.
