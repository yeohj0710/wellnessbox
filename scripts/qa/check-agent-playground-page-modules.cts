import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const PAGE_PATH = path.resolve(ROOT_DIR, "app/agent-playground/page.tsx");
const LAYOUT_PATH = path.resolve(ROOT_DIR, "app/agent-playground/layout.tsx");
const CONTROL_PANEL_PATH = path.resolve(
  ROOT_DIR,
  "app/agent-playground/_components/AgentPlaygroundControlPanel.tsx"
);
const RESULT_PANEL_PATH = path.resolve(
  ROOT_DIR,
  "app/agent-playground/_components/AgentPlaygroundResultPanel.tsx"
);
const TRACE_CARD_PATH = path.resolve(
  ROOT_DIR,
  "app/agent-playground/_components/AgentPlaygroundTraceCard.tsx"
);
const TRACE_TIMELINE_PATH = path.resolve(
  ROOT_DIR,
  "app/agent-playground/_components/AgentPlaygroundTraceTimeline.tsx"
);
const MODEL_PATH = path.resolve(
  ROOT_DIR,
  "app/agent-playground/_lib/agent-playground-page-model.ts"
);

function run() {
  const checks: string[] = [];
  const pageSource = fs.readFileSync(PAGE_PATH, "utf8");
  const layoutSource = fs.readFileSync(LAYOUT_PATH, "utf8");
  const controlPanelSource = fs.readFileSync(CONTROL_PANEL_PATH, "utf8");
  const resultPanelSource = fs.readFileSync(RESULT_PANEL_PATH, "utf8");
  const traceCardSource = fs.readFileSync(TRACE_CARD_PATH, "utf8");
  const traceTimelineSource = fs.readFileSync(TRACE_TIMELINE_PATH, "utf8");
  const modelSource = fs.readFileSync(MODEL_PATH, "utf8");

  for (const token of [
    'from "./_components/AgentPlaygroundControlPanel"',
    'from "./_components/AgentPlaygroundResultPanel"',
    'from "./_components/AgentPlaygroundTraceTimeline"',
    'from "./_lib/agent-playground-page-model"',
    "<AgentPlaygroundControlPanel",
    "<AgentPlaygroundResultPanel",
    "<AgentPlaygroundTraceTimeline",
    "buildComparisonSummary(",
    "extractEvaluation(",
    "resolveCurrentTrace(",
  ]) {
    assert.ok(
      pageSource.includes(token),
      `[qa:agent-playground:page-modules] page missing token: ${token}`
    );
  }
  checks.push("page_uses_extracted_components_and_model");

  for (const token of [
    "const EvaluationSummary =",
    "const TraceCard =",
    "const ResultPanel =",
    "const toPreview =",
  ]) {
    assert.ok(
      !pageSource.includes(token),
      `[qa:agent-playground:page-modules] page should not keep inline helper/component: ${token}`
    );
  }
  checks.push("page_has_no_inline_trace_or_result_components");

  for (const token of [
    "export function AgentPlaygroundControlPanel(",
    "getRunButtonLabel(",
    "onRun(\"llm\")",
    "onRun(\"agent\")",
    "onRun(\"both\")",
  ]) {
    assert.ok(
      controlPanelSource.includes(token),
      `[qa:agent-playground:page-modules] control panel missing token: ${token}`
    );
  }
  checks.push("control_panel_owns_prompt_and_run_actions");

  for (const token of [
    "export function AgentPlaygroundResultPanel(",
    "function EvaluationSummary(",
    'result?.error',
    'JSON.stringify(result.meta, null, 2)',
  ]) {
    assert.ok(
      resultPanelSource.includes(token),
      `[qa:agent-playground:page-modules] result panel missing token: ${token}`
    );
  }
  checks.push("result_panel_owns_result_and_meta_rendering");

  for (const token of [
    "export function AgentPlaygroundTraceTimeline(",
    "<AgentPlaygroundTraceCard",
    'onActiveTraceChange("llm")',
    'onActiveTraceChange("agent")',
  ]) {
    assert.ok(
      traceTimelineSource.includes(token),
      `[qa:agent-playground:page-modules] trace timeline missing token: ${token}`
    );
  }
  checks.push("trace_timeline_owns_trace_switching_and_card_rendering");

  for (const token of [
    "export function AgentPlaygroundTraceCard(",
    "toTracePreview(",
    "JSON.stringify(event, null, 2)",
  ]) {
    assert.ok(
      traceCardSource.includes(token),
      `[qa:agent-playground:page-modules] trace card missing token: ${token}`
    );
  }
  checks.push("trace_card_owns_preview_and_json_dump");

  for (const token of [
    "export function toTracePreview(",
    "export function extractEvaluation(",
    "export function resolveCurrentTrace(",
    "export function buildComparisonSummary(",
    "export function getRunButtonLabel(",
  ]) {
    assert.ok(
      modelSource.includes(token),
      `[qa:agent-playground:page-modules] page model missing token: ${token}`
    );
  }
  checks.push("page_model_owns_shared_view_model_rules");

  for (const token of [
    "Agent Playground",
    "createNoIndexMetadata(",
    'href="/"',
  ]) {
    assert.ok(
      layoutSource.includes(token),
      `[qa:agent-playground:page-modules] layout missing token: ${token}`
    );
  }
  checks.push("layout_keeps_agent_playground_shell");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
