/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const chainSource = read("lib/ai/chain.ts");
  const helperSource = read("lib/ai/chain-known-context.ts");

  assert.ok(
    chainSource.includes('from "./chain-known-context"'),
    "chain.ts should import chain-known-context module"
  );
  assert.ok(
    chainSource.includes("buildKnownContext("),
    "chain.ts should build known context through the helper module"
  );

  const forbiddenChainTokens = [
    "const CAT_ALIAS",
    "function labelOf(",
    "async function buildKnownContext(",
    "getLatestResultsByScope",
    "ensureClient(",
  ];
  for (const token of forbiddenChainTokens) {
    assert.ok(
      !chainSource.includes(token),
      `chain.ts should not inline known-context helper token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "const CAT_ALIAS",
    "function labelOf(",
    "function readHeader(",
    "export async function buildKnownContext(",
    "getLatestResultsByScope",
    "ensureClient(",
    "데이터 범위: 비로그인 기기(clientId) 기반",
    "평가 결과 상위",
    "빠른 검사 상위",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `chain-known-context.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chain_imports_known_context_helper_module",
          "chain_keeps_known_context_rules_out_of_stream_orchestrator",
          "known_context_helper_module_owns_scope_and_label_resolution",
        ],
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error("[qa:chat:chain-known-context] FAIL", error);
  process.exit(1);
}
