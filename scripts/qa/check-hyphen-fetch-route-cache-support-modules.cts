import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-cache.ts");
const SUPPORT_PATH = path.join(ROOT, "lib/server/hyphen/fetch-route-cache-support.ts");

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const entrySource = read(ENTRY_PATH);
  const supportSource = read(SUPPORT_PATH);
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/server\/hyphen\/fetch-route-cache-support"/,
    "fetch-route-cache.ts must import helper rules from fetch-route-cache-support.ts."
  );
  checks.push("entry_imports_fetch_route_cache_support");

  for (const token of [
    "function toFetchRoutePayload(",
    "function asRecord(",
    "type SessionArtifacts =",
    "const linkPatch: {",
    "function collectSessionArtifacts(",
    "function extractSessionArtifactsFromPayload(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `fetch-route-cache.ts should not keep extracted token: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_payload_and_session_artifact_helpers");

  for (const token of [
    "export function toFetchRoutePayload(",
    "export function isServeableNhisCachedPayload(",
    "export type SessionArtifacts =",
    "export function buildSuccessfulCacheLinkPatch(",
    "function collectSessionArtifacts(",
    "export function extractSessionArtifactsFromPayload(",
    "export function buildCachedFetchResponseBody(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `fetch-route-cache-support.ts must own token: ${token}`
    );
  }
  checks.push("support_module_owns_payload_and_session_artifact_rules");

  assert.match(
    entrySource,
    /export \{ isServeableNhisCachedPayload \};/,
    "fetch-route-cache.ts must re-export cache payload guard for stable callers."
  );
  assert.match(
    entrySource,
    /buildSuccessfulCacheLinkPatch\(\{/,
    "fetch-route-cache.ts must build successful cache link patches via support helper."
  );
  assert.match(
    entrySource,
    /buildCachedFetchResponseBody\(\{/,
    "fetch-route-cache.ts must build cached response bodies via support helper."
  );
  assert.ok(
    entrySource.includes("isServeableNhisCachedPayload(cachedPayload)"),
    "fetch-route-cache.ts must still guard memory cache payloads."
  );
  assert.ok(
    entrySource.includes("isServeableNhisCachedPayload(directCachedRaw.payload)"),
    "fetch-route-cache.ts must still guard direct DB cache payloads."
  );
  checks.push("entry_reexports_guard_and_keeps_cache_gate_checks");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
