import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const COLUMNS_PATH = path.resolve(process.cwd(), "app/column/_lib/columns.ts");
const SUMMARY_QUERIES_PATH = path.resolve(
  process.cwd(),
  "app/column/_lib/columns-summary-queries.ts"
);

function run() {
  const columnsSource = fs.readFileSync(COLUMNS_PATH, "utf8");
  const summaryQueriesSource = fs.readFileSync(SUMMARY_QUERIES_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    columnsSource,
    /import \{\s*collectColumnTags,\s*resolveColumnsByTagSlug,\s*selectAdjacentColumnSummaries,\s*selectRelatedColumnSummaries,\s*\} from "\.\/columns-summary-queries";/m,
    "columns.ts must import the extracted summary query helpers."
  );
  checks.push("columns_imports_summary_query_module");

  for (const legacyToken of [
    "const counter = new Map<string, ColumnTag>();",
    "const [allTags, columns] = await Promise.all([",
    "const currentTagSlugs = new Set(",
    "const currentIndex = columns.findIndex((column) => column.slug === normalized);",
  ]) {
    assert.ok(
      !columnsSource.includes(legacyToken),
      `columns.ts should not keep legacy inline summary-query token: ${legacyToken}`
    );
  }
  checks.push("columns_no_longer_keeps_inline_summary_query_logic");

  for (const token of [
    "export function collectColumnTags(columns: ColumnSummary[]): ColumnTag[] {",
    "export function resolveColumnsByTagSlug(",
    "export function selectRelatedColumnSummaries(",
    "export function selectAdjacentColumnSummaries(",
  ]) {
    assert.ok(
      summaryQueriesSource.includes(token),
      `[qa:column:summary-queries] missing summary-query token: ${token}`
    );
  }
  checks.push("summary_query_module_owns_tag_related_adjacent_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
