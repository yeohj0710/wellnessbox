import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RESOLVE_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/recommendedProductActions.resolve.ts"
);
const CATALOG_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/recommendedProductActions.resolve.catalog.ts"
);
const NAME_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/recommendedProductActions.resolve.name.ts"
);
const CATEGORY_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/recommendedProductActions.resolve.category.ts"
);

function run() {
  const resolveSource = fs.readFileSync(RESOLVE_PATH, "utf8");
  const catalogSource = fs.readFileSync(CATALOG_PATH, "utf8");
  const nameSource = fs.readFileSync(NAME_PATH, "utf8");
  const categorySource = fs.readFileSync(CATEGORY_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    resolveSource,
    /import \{ fetchProductNameCatalog \} from "\.\/recommendedProductActions\.resolve\.catalog";/,
    "Resolve module must import fetchProductNameCatalog from the catalog module."
  );
  assert.match(
    resolveSource,
    /import \{ findProductCandidatesByName \} from "\.\/recommendedProductActions\.resolve\.name";/,
    "Resolve module must import findProductCandidatesByName from the name module."
  );
  assert.match(
    resolveSource,
    /import \{\s*isCategoryLikeProductName,\s*isPlaceholderProductName,\s*\} from "\.\/recommendedProductActions\.resolve\.category";/m,
    "Resolve module must import predicate helpers from the category module."
  );
  checks.push("resolve_imports_catalog_name_and_category_modules");

  for (const legacyToken of [
    "const PRODUCT_NAME_CATALOG_TTL_MS = 5 * 60 * 1000;",
    "let productNameCatalogPromise: Promise<ProductNameItem[]> | null = null;",
    "async function fetchProductNameCatalog() {",
    "function scoreNameMatch(targetRaw: string, candidateRaw: string) {",
    "function findProductCandidatesByName(",
    "function isPlaceholderProductName(value: string) {",
    "function isCategoryLikeProductName(productName: string, category: string) {",
  ]) {
    assert.ok(
      !resolveSource.includes(legacyToken),
      `Resolve module should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("resolve_no_longer_keeps_catalog_and_name_scoring_inline");

  for (const token of [
    "const PRODUCT_NAME_CATALOG_TTL_MS = 5 * 60 * 1000;",
    "normalizeCatalogProducts(raw: unknown)",
    "productNameCatalogPromise = fetch(\"/api/product/names\", {",
    "return productNameCatalogPromise;",
  ]) {
    assert.ok(
      catalogSource.includes(token),
      `[qa:chat:recommended-product-actions-resolve] missing catalog token: ${token}`
    );
  }
  checks.push("catalog_module_owns_fetch_and_retry_cache");

  for (const token of [
    "function splitNormalizedTokens(value: string) {",
    "function scoreTokenOverlap(targetValue: string, candidateValue: string) {",
    "export function scoreNameMatch(targetRaw: string, candidateRaw: string) {",
    "export function findProductCandidatesByName(",
  ]) {
    assert.ok(
      nameSource.includes(token),
      `[qa:chat:recommended-product-actions-resolve] missing name token: ${token}`
    );
  }
  checks.push("name_module_owns_name_match_scoring");

  for (const token of [
    "export function isPlaceholderProductName(",
    "placeholderProductNameSet: ReadonlySet<string>",
    "export function isCategoryLikeProductName(",
    "categoryKeywordSet: ReadonlySet<string>",
  ]) {
    assert.ok(
      categorySource.includes(token),
      `[qa:chat:recommended-product-actions-resolve] missing category token: ${token}`
    );
  }
  checks.push("category_module_owns_placeholder_and_category_like_predicates");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
