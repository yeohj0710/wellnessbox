import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const PATTERNS_PATH = path.resolve(ROOT_DIR, "lib/agent-playground/patterns.ts");
const PATTERN_UTILS_PATH = path.resolve(
  ROOT_DIR,
  "lib/agent-playground/pattern-utils.ts"
);
const PATTERN_CONTRACTS_PATH = path.resolve(
  ROOT_DIR,
  "lib/agent-playground/pattern-contracts.ts"
);
const PATTERN_REGISTRY_PATH = path.resolve(
  ROOT_DIR,
  "lib/agent-playground/pattern-registry.ts"
);
const ENGINE_PATH = path.resolve(ROOT_DIR, "lib/agent-playground/engine.ts");
const RUN_PATH = path.resolve(ROOT_DIR, "lib/agent-playground/run.ts");
const PAGE_PATH = path.resolve(ROOT_DIR, "app/agent-playground/page.tsx");

function run() {
  const checks: string[] = [];
  const patternsSource = fs.readFileSync(PATTERNS_PATH, "utf8");
  const patternUtilsSource = fs.readFileSync(PATTERN_UTILS_PATH, "utf8");
  const patternContractsSource = fs.readFileSync(PATTERN_CONTRACTS_PATH, "utf8");
  const patternRegistrySource = fs.readFileSync(PATTERN_REGISTRY_PATH, "utf8");
  const engineSource = fs.readFileSync(ENGINE_PATH, "utf8");
  const runSource = fs.readFileSync(RUN_PATH, "utf8");
  const pageSource = fs.readFileSync(PAGE_PATH, "utf8");

  assert.match(
    patternsSource,
    /from "\.\/pattern-contracts"/,
    "patterns.ts must import the shared pattern contract."
  );
  assert.match(
    patternsSource,
    /from "\.\/pattern-utils"/,
    "patterns.ts must import shared evaluator helpers."
  );
  checks.push("patterns_import_shared_contract_and_helpers");

  assert.match(
    engineSource,
    /from "\.\/pattern-contracts"/,
    "engine.ts must import pattern contracts from the shared contract module."
  );
  checks.push("engine_imports_shared_contracts");

  assert.match(
    runSource,
    /from "\.\/pattern-registry"/,
    "run.ts must import getPattern from the pattern registry module."
  );
  assert.match(
    pageSource,
    /from "@\/lib\/agent-playground\/pattern-registry"/,
    "agent-playground page must import patternSummaries from the pattern registry module."
  );
  checks.push("consumers_import_registry_instead_of_pattern_data_file");

  for (const token of [
    "const sentenceCount =",
    "const lineCount =",
    "const includesAll =",
    "const withinLength =",
    "const parseJson =",
  ]) {
    assert.ok(
      !patternsSource.includes(token),
      `[qa:agent-playground:pattern-modules] patterns.ts should not keep inline helper: ${token}`
    );
  }
  checks.push("patterns_has_no_inline_evaluator_helpers");

  for (const token of [
    "export type AgentContext =",
    "export type AgentStep =",
    "export type AgentPlan =",
    "export type PlaygroundPattern =",
  ]) {
    assert.ok(
      !patternsSource.includes(token),
      `[qa:agent-playground:pattern-modules] patterns.ts should not keep inline contract: ${token}`
    );
  }
  checks.push("patterns_has_no_inline_contract_types");

  for (const token of ["export const patternSummaries =", "export const getPattern ="]) {
    assert.ok(
      !patternsSource.includes(token),
      `[qa:agent-playground:pattern-modules] patterns.ts should not keep registry helper: ${token}`
    );
  }
  checks.push("patterns_has_no_inline_registry_helpers");

  for (const token of [
    'id: "prompt-chaining"',
    'id: "evaluator-optimizer"',
    'id: "parallel-vote"',
    'id: "orchestrator-workers"',
    'id: "routing"',
  ]) {
    assert.ok(
      patternsSource.includes(token),
      `[qa:agent-playground:pattern-modules] patterns.ts must keep inline pattern data token: ${token}`
    );
  }
  checks.push("patterns_owns_pattern_data_blocks");

  for (const token of [
    "export const sentenceCount =",
    "export const lineCount =",
    "export const includesAll =",
    "export const withinLength =",
    "export const parseJson =",
  ]) {
    assert.ok(
      patternUtilsSource.includes(token),
      `[qa:agent-playground:pattern-modules] pattern-utils missing token: ${token}`
    );
  }
  checks.push("pattern_utils_owns_shared_evaluator_helpers");

  for (const token of [
    "export type AgentContext =",
    "export type AgentStep =",
    "export type AgentPlan =",
    "export type PlaygroundPattern =",
  ]) {
    assert.ok(
      patternContractsSource.includes(token),
      `[qa:agent-playground:pattern-modules] pattern-contracts missing token: ${token}`
    );
  }
  checks.push("pattern_contracts_owns_shared_registry_types");

  for (const token of [
    'import { patterns } from "./patterns";',
    "export const patternSummaries = patterns.map",
    "export const getPattern = (patternId?: string) =>",
    "export { patterns };",
  ]) {
    assert.ok(
      patternRegistrySource.includes(token),
      `[qa:agent-playground:pattern-modules] pattern-registry missing token: ${token}`
    );
  }
  checks.push("pattern_registry_owns_lookup_and_summary_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
