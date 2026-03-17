# Chat Hook Architecture (`app/chat/hooks`)

## Goal

Keep `useChat.ts` orchestration-focused and push parsing/branching/side-effect details into focused modules.

## Current Modules

- `useChat.ts`
  - Main chat state machine and hook-level state/effect wiring.
- `useChat.commandLayer.ts`
  - UI-facing command assembly over assistant-turn, assessment, interactive-action, message-flow, and session handlers.
- `useChat.commandLayer.helpers.ts`
  - Shared command-layer state mutations such as follow-up reset, executed-action memory, and assistant message patching.
- `useChat.api.ts`
  - API wrappers for chat, title, suggestions, actions, save, and delete.
- `useChat.browser.ts`
  - Browser-only side effects (navigation, cart open/clear, external link).
- `useChat.suggestions.ts`
  - Suggestion merge/dedupe/history utilities.
- `useChat.agentDecision.ts`
  - Action execution decision normalization and fallback policy.
- `useChat.interactiveActions.ts`
  - Interactive action execution flows.
- `useChat.interactiveActions.routes.ts`
  - Route/page-focus/support-link interactive action config and execution helpers.
- `useChat.interactiveActions.types.ts`
  - Shared interactive action contracts reused by chat action layers.
- `useChat.assessment.ts`
  - In-chat assessment question model and answer parsing.
- `useChat.evaluation.ts`
  - Quick/deep assessment scoring and result persistence calls.
- `useChat.cart-command.ts`
  - Cart command parsing and summary formatting.
- `useChat.session.ts`
  - Session draft/merge/title defaults.
- `useChat.results.ts`
  - Public result-normalization entry used by chat and shared personalization layers.
- `useChat.results.types.ts`
  - Shared normalized result contracts reused outside the chat hook.
- `useChat.results.normalize.ts`
  - All-results payload parsing and local result restoration helpers.
- `useChat.text.ts`, `useChat.stream.ts`, `useChat.recommendation.ts`
  - Text normalization, stream reader, and recommendation-price hydration orchestration.
- `useChat.recommendation.catalog.ts`
  - Home-data fetch/cache, best-option selection, and fallback recommendation catalog shaping.
- `useChat.assistant.ts`
  - Shared assistant stream flow (`/api/chat` request -> stream read -> sanitize -> recommendation hydration).
- `useChat.persistence.ts`
  - Session persistence helpers (persistable filter + idempotent save-once transport).
- `useChat.sessionState.ts`
  - Pure immutable session-state update helpers.
- `useChat.sendMessage.ts`
  - Outgoing turn preparation helper (trim/validate/session refs/message construction).
- `useChat.sendMessageFlow.ts`
  - Deterministic send branch resolver (assessment/offline/action/cart/stream).
- `useChat.actionFlow.ts`
  - Cart-command and action-decision handlers used by `sendMessage`.
- `useChat.streamTurn.ts`
  - Shared streamed-assistant turn runner for `sendMessage` and initial assistant bootstrap.
- `useChat.initialAssistant.ts`
  - Initial assistant bootstrap flow (empty-session guard, offline fallback, stream start, error handling).
- `useChat.sessionActions.ts`
  - Session create/delete transition helpers.
- `useChat.finalizeFlow.ts`
  - Assistant turn finalization and title generation flow helpers.
- `useChat.assessmentFlow.ts`
  - In-chat assessment bootstrap/input handling helpers.
- `useChat.copy.ts`
  - Chat UX copy constants and assistant error-text formatter.
- `useChat.lifecycle.ts`
  - Session/profile/results bootstrap data loaders.
- `useChat.bootstrap.helpers.ts`
  - Pure bootstrap steps for initial session state, remote session merge, profile resolve, and all-results hydration.
- `useChat.ui.ts`
  - Drawer/scroll UI helpers.
- `useChat.interactionGuard.ts`
  - Duplicate interactive-action guard (debounce policy).
- `useChat.bootstrap.ts`
  - Bootstrap effect wrappers consumed by `useChat.ts`; keep async procedure details in `useChat.bootstrap.helpers.ts`.
- `useChat.derived.ts`
  - Derived context/state builders (summary, action-context text, guide/capability visibility).

## Refactor Rule

- Add new logic to module files first.
- Keep `useChat.ts` focused on state composition and orchestration.
- Keep handler assembly and closure helpers in `useChat.commandLayer.ts`.
- Keep route/page-focus/support-link config in `useChat.interactiveActions.routes.ts`.
- Keep recommendation hydration flow in `useChat.recommendation.ts` and cache/option selection in `useChat.recommendation.catalog.ts`.
- If a function can run without React state setters, move it out.

## Next Safe Targets

1. Split `ReferenceData.tsx` section JSX into smaller presentational blocks if chat context cards grow again.
2. Add a lightweight Playwright smoke flow for dock open -> send -> close.
3. If `useChat.commandLayer.ts` grows again, split actor-aware session commands from assistant-turn/message-flow assembly.
