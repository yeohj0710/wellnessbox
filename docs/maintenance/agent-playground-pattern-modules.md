# Agent Playground Pattern Modules

## Goal
- Keep `lib/agent-playground/patterns.ts` focused on pattern data, evaluators, and agent plans.
- Move reusable evaluator helpers, shared contracts, and registry lookups into small supporting modules so future sessions can change one concern at a time.

## Scope
- Pattern registry:
  - `lib/agent-playground/pattern-registry.ts`
- Pattern data:
  - `lib/agent-playground/patterns.ts`
- Shared pattern contracts:
  - `lib/agent-playground/pattern-contracts.ts`
- Shared evaluator helpers:
  - `lib/agent-playground/pattern-utils.ts`
- Engine consumer:
  - `lib/agent-playground/engine.ts`
- QA guard:
  - `scripts/qa/check-agent-playground-pattern-modules.cts`
  - npm script: `qa:agent-playground:pattern-modules`

## Responsibility
- `pattern-registry.ts`
  - own `patternSummaries`, `getPattern`, and the stable registry import surface
  - keep page and run flow pointed at a small lookup-focused module
- `patterns.ts`
  - own the final ordered array of pattern data
  - keep evaluator and agent plan details close to each pattern entry
- `pattern-contracts.ts`
  - own `AgentContext`, `AgentStep`, `AgentPlan`, `PlaygroundPattern`
  - keep engine and registry aligned on the same type contract
- `pattern-utils.ts`
  - own reusable evaluator helpers:
    - `sentenceCount`
    - `lineCount`
    - `includesAll`
    - `withinLength`
    - `parseJson`
- `engine.ts`
  - consume shared contracts from `pattern-contracts.ts`
  - avoid importing registry-only modules just to read type definitions

## Edit Guide
- Change shared type shape in `pattern-contracts.ts` first.
- Change generic evaluator helpers in `pattern-utils.ts`.
- Change lookup or summary behavior in `pattern-registry.ts`.
- Change concrete pattern copy, evaluator logic, or agent plan steps in `patterns.ts`.
- Keep `patterns.ts` free of inline shared helper implementations, shared contract definitions, and registry lookup helpers.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:agent-playground:pattern-modules`
3. `npm run lint`
4. `npm run build`
