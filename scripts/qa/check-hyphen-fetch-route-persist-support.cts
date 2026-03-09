import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-persist.ts");
const SUPPORT_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-route-persist-support.ts"
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
    /from "@\/lib\/server\/hyphen\/fetch-route-persist-support"/,
    "fetch-route-persist.ts must import persist support helpers."
  );
  checks.push("entry_imports_persist_support");

  for (const token of [
    "export async function recordNhisFetchAttemptSafe(",
    "export async function enrichNhisPayloadWithAiSummarySafe(",
    "export function normalizeFailedCodes(",
    "export function resolveNhisFetchFailedStatusCode(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `persist support must own token: ${token}`
    );
  }
  checks.push("support_owns_persist_helpers");

  assert.ok(
    entrySource.includes("const payloadWithAiSummary = await enrichNhisPayloadWithAiSummarySafe("),
    "fetch-route-persist.ts must delegate AI summary wrapping to support helper"
  );
  assert.ok(
    entrySource.includes("const failedStatusCode = resolveNhisFetchFailedStatusCode({"),
    "fetch-route-persist.ts must delegate failed status resolution to support helper"
  );
  assert.ok(
    entrySource.includes("await recordNhisFetchAttemptSafe({"),
    "fetch-route-persist.ts must delegate attempt logging to support helper"
  );
  checks.push("entry_uses_persist_support_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
