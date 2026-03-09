import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_PATH = path.join(ROOT, "lib/server/hyphen/fetch-cache.ts");
const SUPPORT_PATH = path.join(ROOT, "lib/server/hyphen/fetch-cache-support.ts");
const QUERY_SUPPORT_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-cache-query-support.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const entrySource = read(ENTRY_PATH);
  const supportSource = read(SUPPORT_PATH);
  const querySupportSource = read(QUERY_SUPPORT_PATH);
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/server\/hyphen\/fetch-cache-support"/,
    "fetch-cache.ts must import shared helper rules from fetch-cache-support.ts."
  );
  assert.match(
    entrySource,
    /from "@\/lib\/server\/hyphen\/fetch-cache-query-support"/,
    "fetch-cache.ts must import query helper rules from fetch-cache-query-support.ts."
  );
  checks.push("entry_imports_fetch_cache_support");

  for (const token of [
    "const DEFAULT_HASH_SALT =",
    "const DEFAULT_SUMMARY_TTL_MINUTES =",
    "function normalizeText(",
    "function normalizeDigits(",
    "function envNumber(",
    "function cacheSalt(",
    "function sha256(",
    "function hashWithSalt(",
    "function asJsonValue(",
    "function resolveCacheTtlMinutes(",
    "type IdentityCacheLookupInput =",
    "type IdentityGlobalCacheLookupInput =",
    "type IdentityCacheQueryMode =",
    "const where: Prisma.HealthProviderFetchCacheWhereInput = {",
    "export function resolveNhisIdentityHash(",
    "export function buildNhisFetchRequestHash(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `fetch-cache.ts should not keep extracted helper token: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_hash_ttl_or_identity_helpers");

  for (const token of [
    "export type FetchLikePayload =",
    "export type ResolveIdentityInput =",
    "export type BuildRequestHashInput =",
    "export function normalizeNhisFetchTargets(",
    "export function toNhisFetchCacheJsonValue(",
    "export function resolveNhisFetchCacheTtlMinutes(",
    "export function resolveNhisIdentityHash(",
    "export function buildNhisFetchRequestHash(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `fetch-cache-support.ts must own helper token: ${token}`
    );
  }
  checks.push("support_module_owns_hash_ttl_json_and_identity_rules");

  for (const token of [
    "export type IdentityCacheLookupInput =",
    "export type IdentityGlobalCacheLookupInput =",
    "export type IdentityCacheQueryMode =",
    "export function buildIdentityCacheLookupWhere(",
    "export function buildIdentityGlobalCacheLookupWhere(",
  ]) {
    assert.ok(
      querySupportSource.includes(token),
      `fetch-cache-query-support.ts must own helper token: ${token}`
    );
  }
  checks.push("query_support_module_owns_identity_cache_where_builders");

  assert.match(
    entrySource,
    /export \{ buildNhisFetchRequestHash, resolveNhisIdentityHash \};/,
    "fetch-cache.ts must re-export public hash helpers for stable imports."
  );
  assert.match(
    entrySource,
    /where: buildIdentityGlobalCacheLookupWhere\(input\),/,
    "fetch-cache.ts must use extracted identity global cache where helper."
  );
  assert.match(
    entrySource,
    /where: buildIdentityCacheLookupWhere\(input, mode, new Date\(\)\),/,
    "fetch-cache.ts must use extracted identity cache where helper."
  );
  assert.match(
    entrySource,
    /const ttlMinutes = resolveNhisFetchCacheTtlMinutes\(input\.targets, input\.payload\);/,
    "fetch-cache.ts must use extracted TTL helper."
  );
  assert.match(
    entrySource,
    /payload: toNhisFetchCacheJsonValue\(input\.payload\),/,
    "fetch-cache.ts must use extracted JSON serialization helper."
  );
  checks.push("entry_uses_extracted_support_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
