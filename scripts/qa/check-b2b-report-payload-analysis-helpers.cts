/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const analysisSource = read("lib/b2b/report-payload-analysis.ts");
  const helperSource = read("lib/b2b/report-payload-analysis-helpers.ts");

  assert.ok(
    analysisSource.includes('from "@/lib/b2b/report-payload-analysis-helpers"'),
    "report-payload-analysis.ts should import analysis helper module"
  );

  const forbiddenAnalysisTokens = [
    "map((item) => asRecord(item))",
    "filter((item): item is JsonRecord => Boolean(item))",
    'title: toText(item.title) || "?댁뒋"',
  ];
  for (const token of forbiddenAnalysisTokens) {
    assert.ok(
      !analysisSource.includes(token),
      `report-payload-analysis.ts should not inline repeated row parsing token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "export function extractAnalysisTopIssues(",
    "export function extractAnalysisSectionScores(",
    "export function extractAnalysisCoreMetrics(",
    "export function extractAnalysisHealthRiskFlags(",
    "export function extractAnalysisTrendMonths(",
    "export function extractAnalysisExternalCards(",
    "export function extractTextArray(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `report-payload-analysis-helpers.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "analysis_entrypoint_imports_helper_module",
          "analysis_entrypoint_keeps_repeated_row_parsing_out",
          "analysis_helper_module_owns_row_normalization_rules",
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
  console.error("[qa:b2b:report-payload-analysis-helpers] FAIL", error);
  process.exit(1);
}
