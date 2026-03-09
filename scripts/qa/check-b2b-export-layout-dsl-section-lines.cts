import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DSL_PATH = path.join(ROOT, "lib/b2b/export/layout-dsl.ts");
const SECTION_LINES_PATH = path.join(
  ROOT,
  "lib/b2b/export/layout-dsl-section-lines.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const dslSource = read(DSL_PATH);
  const sectionLinesSource = read(SECTION_LINES_PATH);
  const checks: string[] = [];

  assert.match(
    dslSource,
    /from "@\/lib\/b2b\/export\/layout-dsl-section-lines"/,
    "layout-dsl must import section line helpers."
  );
  checks.push("dsl_imports_section_line_helpers");

  for (const token of [
    "function buildSummaryLines(",
    "function buildHealthLines(",
    "function buildMedicationLines(",
    "function buildSurveyLines(",
    "function buildGuideLines(",
    "function buildTrendLines(",
  ]) {
    assert.ok(
      !dslSource.includes(token),
      `layout-dsl should not inline line builder after extraction: ${token}`
    );
  }
  checks.push("dsl_keeps_line_builders_out");

  for (const token of [
    "export function buildSummaryLines(",
    "export function buildHealthLines(",
    "export function buildMedicationLines(",
    "export function buildSurveyLines(",
    "export function buildPharmacistAndAiLines(",
    "export function buildGuideLines(",
    "export function buildTrendLines(",
    "export function renderScoreGaugeText(",
  ]) {
    assert.ok(
      sectionLinesSource.includes(token),
      `layout-dsl section line helper module must own token: ${token}`
    );
  }
  checks.push("section_line_module_owns_content_builders");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
