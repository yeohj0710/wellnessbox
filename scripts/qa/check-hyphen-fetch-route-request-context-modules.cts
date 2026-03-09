import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-helpers.ts");
const SUPPORT_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-request-context.ts");

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const entrySource = read(ENTRY_PATH);
  const supportSource = read(SUPPORT_PATH);
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/server\/hyphen\/fetch-route-request-context"/,
    "fetch-route-helpers.ts must import request context helpers."
  );
  checks.push("entry_imports_request_context_support");

  for (const token of [
    "export function buildBasePayload(",
    "export function buildDetailPayload(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `fetch-route-helpers.ts should not keep extracted token: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_inline_payload_builders");

  for (const token of [
    "export function buildBasePayload(",
    "export function buildDetailPayload(",
    "export function resolveNhisFetchRequestContext(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `fetch-route-request-context.ts must own token: ${token}`
    );
  }
  checks.push("support_module_owns_request_context_builders");

  assert.match(
    entrySource,
    /const requestContext = resolveNhisFetchRequestContext\(\{/,
    "fetch-route-helpers.ts must build request context via support helper."
  );
  assert.ok(
    entrySource.includes("requestHashMeta: requestContext.requestHashMeta"),
    "fetch-route-helpers.ts must pass requestHashMeta from resolved request context."
  );
  assert.ok(
    entrySource.includes("basePayload: requestContext.basePayload"),
    "fetch-route-helpers.ts must use extracted base payload."
  );
  checks.push("entry_uses_extracted_request_context");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
