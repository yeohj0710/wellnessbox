# Chat Actions Modules

`/api/chat/actions` route logic has been split into focused modules:

- `shared.ts`
  - request body types
  - text/score normalization
  - execute decision normalize/merge/sanitize
  - transcript utility
- `fallback.ts`
  - rule-based fallback decision for `execute`
  - rule-based fallback UI actions for `suggest`
- `model.ts`
  - OpenAI call wrappers
  - model-based decision/suggestion parsers

`app/api/chat/actions/route.ts` should remain a thin orchestrator.
