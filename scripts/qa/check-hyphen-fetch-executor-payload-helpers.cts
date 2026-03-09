import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXECUTOR_PATH = path.join(ROOT, "lib/server/hyphen/fetch-executor.ts");
const PAYLOAD_HELPER_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-executor.payload-helpers.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const executorSource = read(EXECUTOR_PATH);
  const helperSource = read(PAYLOAD_HELPER_PATH);
  const checks: string[] = [];

  assert.match(
    executorSource,
    /from "@\/lib\/server\/hyphen\/fetch-executor\.payload-helpers"/,
    "fetch-executor must import payload helpers."
  );
  checks.push("executor_imports_payload_helpers");

  const forbiddenExecutorTokens = [
    "function getErrorBody(error: unknown): unknown | null {",
    "function emptyPayload(): HyphenApiResponse {",
    "function resolvePayloadData(payload: HyphenApiResponse) {",
    "function buildSuccessfulFetchPayload(input: {",
  ];
  for (const token of forbiddenExecutorTokens) {
    assert.ok(
      !executorSource.includes(token),
      `fetch-executor should not inline token after extraction: ${token}`
    );
  }
  checks.push("executor_keeps_payload_helpers_out");

  const requiredHelperTokens = [
    "export function getErrorBody(",
    "export function emptyPayload(",
    "export function payloadHasAnyRows(",
    "export function getTargetPayload<T>(",
    "export function buildSuccessfulFetchPayload(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `payload helper module must own token: ${token}`
    );
  }
  checks.push("payload_helper_owns_shared_payload_logic");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
