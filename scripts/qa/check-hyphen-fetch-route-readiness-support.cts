import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-helpers.ts");
const SUPPORT_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-route-readiness-support.ts"
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
    /from "@\/lib\/server\/hyphen\/fetch-route-readiness-support"/,
    "fetch-route-helpers.ts must import readiness support helpers."
  );
  checks.push("entry_imports_readiness_support");

  for (const token of [
    "export function buildBlockedTargetsResponse(",
    "export function buildInitRequiredFetchResponse(",
    "export function buildMissingCookieSessionResponse(",
    "export function resolveFailedNhisFetchResponse(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `readiness support must own token: ${token}`
    );
  }
  checks.push("support_owns_readiness_response_builders");

  assert.ok(
    entrySource.includes("response: buildBlockedTargetsResponse(blockedTargets)"),
    "fetch-route-helpers.ts must delegate blocked target response building"
  );
  assert.ok(
    entrySource.includes("response: buildInitRequiredFetchResponse()"),
    "fetch-route-helpers.ts must delegate init-required response building"
  );
  assert.ok(
    entrySource.includes("response: buildMissingCookieSessionResponse()"),
    "fetch-route-helpers.ts must delegate missing-cookie response building"
  );
  checks.push("entry_uses_readiness_response_builders");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
