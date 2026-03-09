import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SHARED_UTILS_PATH = path.resolve(
  ROOT_DIR,
  "lib/agent-playground/shared-utils.ts"
);
const ENGINE_PATH = path.resolve(ROOT_DIR, "lib/agent-playground/engine.ts");
const RUN_PATH = path.resolve(ROOT_DIR, "lib/agent-playground/run.ts");

function run() {
  const checks: string[] = [];
  const sharedUtilsSource = fs.readFileSync(SHARED_UTILS_PATH, "utf8");
  const engineSource = fs.readFileSync(ENGINE_PATH, "utf8");
  const runSource = fs.readFileSync(RUN_PATH, "utf8");

  for (const token of [
    "export const safeAnswer =",
    "export const coerceSingleLine =",
    "export const ensureTerms =",
    "export const normalizeRouteId =",
    "export const buildMessages =",
  ]) {
    assert.ok(
      sharedUtilsSource.includes(token),
      `[qa:agent-playground:shared-utils] shared-utils missing token: ${token}`
    );
  }
  checks.push("shared_utils_owns_common_message_and_string_helpers");

  assert.match(
    engineSource,
    /from "\.\/shared-utils"/,
    "engine.ts must import helper functions from shared-utils."
  );
  assert.match(
    runSource,
    /from "\.\/shared-utils"/,
    "run.ts must import safeAnswer from shared-utils."
  );
  checks.push("engine_and_run_import_shared_utils");

  for (const token of [
    "const safeAnswer =",
    "const coerceSingleLine =",
    "const ensureTerms =",
    "const normalizeRouteId =",
    "const buildMessages =",
  ]) {
    assert.ok(
      !engineSource.includes(token),
      `[qa:agent-playground:shared-utils] engine.ts should not keep inline helper: ${token}`
    );
  }
  checks.push("engine_has_no_inline_common_helpers");

  assert.ok(
    !runSource.includes("const safeAnswer ="),
    "[qa:agent-playground:shared-utils] run.ts should not keep inline safeAnswer."
  );
  checks.push("run_has_no_inline_safe_answer");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
