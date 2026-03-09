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
  const helperSource = read("lib/ai/chain-product-brief.ts");

  assert.ok(
    chainSource.includes('from "./chain-product-brief"'),
    "chain.ts should import chain-product-brief module"
  );
  assert.ok(
    chainSource.includes("void warmProductBriefCache();"),
    "chain.ts should warm product brief cache through the helper module"
  );
  assert.ok(
    chainSource.includes("loadProductBriefCached()"),
    "chain.ts should load product brief via the helper module"
  );

  const forbiddenChainTokens = [
    "function buildProductBriefFromCatalog(",
    "function buildProductBriefFromSummaries(",
    "async function loadProductBrief(",
    "function refreshProductBriefCache(",
    "function getProductBriefCacheTtlMs(",
    "const CATEGORY_SYNONYMS",
  ];
  for (const token of forbiddenChainTokens) {
    assert.ok(
      !chainSource.includes(token),
      `chain.ts should not inline product-brief helper token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "const CATEGORY_SYNONYMS",
    "function buildProductBriefFromCatalog(",
    "function buildProductBriefFromSummaries(",
    "async function loadProductBrief(",
    "function refreshProductBriefCache(",
    "function getProductBriefCacheTtlMs(",
    "export async function loadProductBriefCached(",
    "export function warmProductBriefCache(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `chain-product-brief.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "chain_imports_product_brief_helper_module",
          "chain_keeps_product_brief_rules_out_of_stream_orchestrator",
          "product_brief_helper_module_owns_catalog_and_cache_logic",
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
  console.error("[qa:chat:chain-product-brief] FAIL", error);
  process.exit(1);
}
