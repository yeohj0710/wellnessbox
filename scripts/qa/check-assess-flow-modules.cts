import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FLOW_PATH = path.resolve(process.cwd(), "app/assess/useAssessFlow.ts");
const DERIVED_PATH = path.resolve(process.cwd(), "app/assess/useAssessFlow.derived.ts");
const LIFECYCLE_PATH = path.resolve(process.cwd(), "app/assess/useAssessFlow.lifecycle.ts");
const TYPES_PATH = path.resolve(process.cwd(), "app/assess/useAssessFlow.types.ts");

function run() {
  const flowSource = fs.readFileSync(FLOW_PATH, "utf8");
  const derivedSource = fs.readFileSync(DERIVED_PATH, "utf8");
  const lifecycleSource = fs.readFileSync(LIFECYCLE_PATH, "utf8");
  const typesSource = fs.readFileSync(TYPES_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    flowSource,
    /import \{ useAssessFlowDerivedState \} from "\.\/useAssessFlow\.derived";/,
    "useAssessFlow.ts must import the extracted derived-state hook."
  );
  assert.match(
    flowSource,
    /import \{ useAssessFlowLifecycle \} from "\.\/useAssessFlow\.lifecycle";/,
    "useAssessFlow.ts must import the extracted lifecycle hook."
  );
  assert.match(
    flowSource,
    /import type \{ AssessSection \} from "\.\/useAssessFlow\.types";/,
    "useAssessFlow.ts must import the shared AssessSection contract."
  );
  checks.push("flow_imports_extracted_boundaries");

  for (const legacyToken of [
    "refreshClientIdCookieIfNeeded();",
    "useChatPageActionListener(",
    "loadAssessStateSnapshot(",
    "saveAssessStateSnapshot(",
    "fetchCategories(controller.signal)",
    "resolveProgressMessage(",
  ]) {
    assert.ok(
      !flowSource.includes(legacyToken),
      `useAssessFlow.ts should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("flow_no_longer_owns_inline_effects_or_derived_logic");

  for (const token of [
    'export function useAssessFlowDerivedState(',
    "const recommendedIds = useMemo(() => {",
    "const currentQuestion = useMemo(() => {",
    "const { completion, answered, total } = useMemo(() => {",
    'const sectionTitle = section === "A" ? "기초 건강 데이터" : "생활 습관·증상";',
  ]) {
    assert.ok(
      derivedSource.includes(token),
      `[qa:assess:flow-modules] missing derived-state token: ${token}`
    );
  }
  checks.push("derived_hook_owns_progress_question_and_recommendation_state");

  for (const token of [
    "export function useAssessFlowLifecycle(",
    "refreshClientIdCookieIfNeeded();",
    "useChatPageActionListener(",
    "loadAssessStateSnapshot(ASSESS_STORAGE_KEY)",
    "saveAssessStateSnapshot(ASSESS_STORAGE_KEY, next);",
    "fetchCategories(controller.signal)",
  ]) {
    assert.ok(
      lifecycleSource.includes(token),
      `[qa:assess:flow-modules] missing lifecycle token: ${token}`
    );
  }
  checks.push("lifecycle_hook_owns_storage_dom_and_fetch_effects");

  assert.match(
    typesSource,
    /export type AssessSection = "INTRO" \| "A" \| "B" \| "C" \| "DONE";/,
    "AssessSection should live in the shared types file."
  );
  checks.push("types_file_owns_assess_section_contract");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
