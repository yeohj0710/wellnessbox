import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.recommendation.ts"
);
const CATALOG_PATH = path.resolve(
  process.cwd(),
  "app/chat/hooks/useChat.recommendation.catalog.ts"
);
const README_PATH = path.resolve(process.cwd(), "app/chat/hooks/README.md");

function run() {
  const rootSource = fs.readFileSync(ROOT_PATH, "utf8");
  const catalogSource = fs.readFileSync(CATALOG_PATH, "utf8");
  const readmeSource = fs.readFileSync(README_PATH, "utf8");
  const checks: string[] = [];

  for (const token of [
    'from "./useChat.recommendation.catalog";',
    "loadCatalogByCategory,",
    "type CatalogEntry,",
    "toKrw,",
    "async function buildResolvedRecommendationPriceMap(",
    "function hydrateResolvedPriceLines(",
    "function hydrateMissingPriceLines(",
    "export async function hydrateRecommendationPrices(",
  ]) {
    assert.ok(
      rootSource.includes(token),
      `[qa:chat:recommendation-modules] missing root token: ${token}`
    );
  }
  checks.push("root_owns_recommendation_price_hydration_orchestration");

  for (const legacyToken of [
    "type CatalogCacheState = {",
    "const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;",
    "const catalogCache: CatalogCacheState = {",
    "function toPositivePrice(",
    "function pickBestOption(",
    "function buildCatalogByCategory(",
    "async function fetchHomeProducts()",
    "async function loadCatalogByCategory()",
    "function formatKrw(value: number)",
  ]) {
    assert.ok(
      !rootSource.includes(legacyToken),
      `useChat.recommendation.ts should not keep inline catalog token: ${legacyToken}`
    );
  }
  checks.push("root_no_longer_keeps_catalog_cache_builders_or_local_currency_formatter");

  for (const token of [
    'from "../components/recommendedProductActions.shared";',
    "export type CatalogEntry = {",
    "type CatalogCacheState = {",
    "const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;",
    "const catalogCache: CatalogCacheState = {",
    "function pickBestOption(",
    "export function buildCatalogByCategory(",
    'fetch("/api/home-data", { method: "GET" })',
    "export async function loadCatalogByCategory(",
  ]) {
    assert.ok(
      catalogSource.includes(token),
      `[qa:chat:recommendation-modules] missing catalog token: ${token}`
    );
  }
  checks.push("catalog_module_owns_home_data_cache_and_best_option_selection");

  for (const token of [
    "useChat.recommendation.ts",
    "useChat.recommendation.catalog.ts",
  ]) {
    assert.ok(
      readmeSource.includes(token),
      `[qa:chat:recommendation-modules] README missing token: ${token}`
    );
  }
  checks.push("hooks_readme_mentions_recommendation_root_and_catalog_modules");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
