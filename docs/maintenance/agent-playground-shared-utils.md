# Agent Playground Shared Utils

## Goal
- Keep `engine.ts` and `run.ts` focused on execution flow instead of repeating small string/message helpers.
- Give future sessions one place to update shared message coercion and prompt-message assembly behavior.

## Scope
- Shared utility module:
  - `lib/agent-playground/shared-utils.ts`
- Engine consumer:
  - `lib/agent-playground/engine.ts`
- Run-flow consumer:
  - `lib/agent-playground/run.ts`
- QA guard:
  - `scripts/qa/check-agent-playground-shared-utils.cts`
  - npm script: `qa:agent-playground:shared-utils`

## Responsibility
- `shared-utils.ts`
  - own `safeAnswer`
  - own string normalization helpers for repairs and routing
  - own `buildMessages` for `NodePrompt -> LangChain messages`
- `engine.ts`
  - own agent workflow execution, retries, repair prompts, and route handling
  - consume shared helper functions instead of redefining them
- `run.ts`
  - own request validation, mode branching, baseline LLM execution, and API key gating
  - consume `safeAnswer` from `shared-utils.ts`

## Edit Guide
- Change shared string coercion or `NodePrompt` message assembly in `shared-utils.ts`.
- Change baseline LLM flow in `run.ts`.
- Change agent execution or repair policies in `engine.ts`.
- Do not reintroduce inline `safeAnswer`, `buildMessages`, `ensureTerms`, `normalizeRouteId`, or `coerceSingleLine` in consumers.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:agent-playground:shared-utils`
3. `npm run lint`
4. `npm run build`
