import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-gate.ts");
const SUPPORT_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-route-gate-support.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const entrySource = read(ENTRY_PATH);
  const supportSource = read(SUPPORT_PATH);
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/server\/hyphen\/fetch-route-gate-support"/,
    "fetch-route-gate.ts must import gate support helpers."
  );
  checks.push("entry_imports_gate_support");

  for (const token of [
    "export async function tryServeForceRefreshGate(",
    "export function buildFetchBudgetBlockedResponse(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `gate support must own token: ${token}`
    );
  }
  checks.push("support_owns_gate_helpers");

  assert.ok(
    entrySource.includes("return tryServeForceRefreshGate(input);"),
    "fetch-route-gate.ts must delegate force-refresh gate flow"
  );
  assert.ok(
    entrySource.includes("buildFetchBudgetBlockedResponseSupport(fetchBudget)"),
    "fetch-route-gate.ts must delegate budget-blocked response body"
  );
  checks.push("entry_uses_gate_support_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
