# Agent Playground Page Modules

## Goal
- Keep `app/agent-playground/page.tsx` as a page shell instead of a mixed file with local panels, trace cards, and view-model helpers.
- Give future sessions explicit entry points for prompt controls, result rendering, trace rendering, and shared page derivation rules.

## Scope
- Page shell:
  - `app/agent-playground/page.tsx`
- Route shell:
  - `app/agent-playground/layout.tsx`
- Prompt and run controls:
  - `app/agent-playground/_components/AgentPlaygroundControlPanel.tsx`
- Result cards:
  - `app/agent-playground/_components/AgentPlaygroundResultPanel.tsx`
- Trace rendering:
  - `app/agent-playground/_components/AgentPlaygroundTraceTimeline.tsx`
  - `app/agent-playground/_components/AgentPlaygroundTraceCard.tsx`
- Shared page model:
  - `app/agent-playground/_lib/agent-playground-page-model.ts`
- QA guard:
  - `scripts/qa/check-agent-playground-page-modules.cts`
  - npm script: `qa:agent-playground:page-modules`

## Responsibility
- `page.tsx`
  - own fetch flow, page state, selected pattern state, trace expansion state
  - wire results into extracted UI blocks
- `AgentPlaygroundControlPanel.tsx`
  - own pattern select, prompt textarea, default-prompt actions, run buttons, comparison banner
- `AgentPlaygroundResultPanel.tsx`
  - own answer rendering, evaluation badge, violations list, metadata expansion
- `AgentPlaygroundTraceTimeline.tsx`
  - own trace mode switch and trace card list
- `AgentPlaygroundTraceCard.tsx`
  - own per-event preview and JSON dump
- `agent-playground-page-model.ts`
  - own comparison summary rules, current trace selection, evaluation extraction, button labels, preview truncation
- `layout.tsx`
  - keep noindex route shell and top-level navigation copy

## Edit Guide
- Change prompt form UX in `AgentPlaygroundControlPanel.tsx`.
- Change result/meta presentation in `AgentPlaygroundResultPanel.tsx`.
- Change trace switching or trace card rendering in `AgentPlaygroundTraceTimeline.tsx` or `AgentPlaygroundTraceCard.tsx`.
- Change comparison summary wording, run-button labels, or trace selection rules in `agent-playground-page-model.ts`.
- Keep `page.tsx` focused on orchestration; do not reintroduce local `ResultPanel`, `TraceCard`, or `EvaluationSummary` definitions there.

## Validation
1. `npm run audit:encoding`
2. `npm run qa:agent-playground:page-modules`
3. `npm run lint`
4. `npm run build`
