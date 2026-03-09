import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const QUERIES_PATH = path.resolve(ROOT_DIR, "lib/order/queries.ts");
const SUPPORT_PATH = path.resolve(ROOT_DIR, "lib/order/query-support.ts");

function run() {
  const queriesSource = fs.readFileSync(QUERIES_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    queriesSource,
    /from "\.\/query-support"/,
    "order queries must import extracted query support helpers."
  );
  checks.push("queries_import_query_support");

  for (const token of [
    "const basicOrderSelection =",
    "const basicOperatorOrderSelection =",
    "function normalizePagination(",
    "function formatPhoneWithHyphens(",
    "function buildPhoneCandidates(",
    "async function getPaginatedOrders(",
  ]) {
    assert.ok(
      !queriesSource.includes(token),
      `[qa:order:query-support-modules] queries.ts should not keep extracted helper: ${token}`
    );
  }
  checks.push("queries_no_longer_keep_inline_support_helpers");

  for (const token of [
    "export const basicOrderSelection =",
    "export const basicOperatorOrderSelection =",
    "export type BasicOperatorOrderPage =",
    "export const DEFAULT_ORDER_QUERY_PAGE = 1;",
    "export const DEFAULT_ORDER_QUERY_TAKE = 10;",
    "export function normalizeOrderQueryPagination(",
    "export function buildOrderPhoneCandidates(",
    "export async function getPaginatedOrderSummaries(",
    "export async function getBasicOperatorOrdersPage(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:order:query-support-modules] query-support.ts missing token: ${token}`
    );
  }
  checks.push("query_support_owns_shared_selection_pagination_and_phone_logic");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
