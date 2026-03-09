/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const cardInsightsSource = read("components/b2b/report-summary/card-insights.ts");
  const helperSource = read("components/b2b/report-summary/card-insight-text.ts");

  assert.ok(
    cardInsightsSource.includes('from "./card-insight-text"'),
    "card-insights should import shared text helpers from card-insight-text"
  );
  assert.ok(
    cardInsightsSource.includes('} from "./card-insight-text";'),
    "card-insights should re-export shared helper contract"
  );
  assert.ok(
    !cardInsightsSource.includes("function getOptionLabelByQuestionKey"),
    "card-insights should not keep option label lookup internals after extraction"
  );
  assert.ok(
    !cardInsightsSource.includes("function isCodeLikeAnswerText"),
    "card-insights should not keep answer-code detection internals after extraction"
  );
  assert.ok(
    helperSource.includes("export function decodeAnswerTextByQuestionKey"),
    "card-insight-text should own answer decoding"
  );
  assert.ok(
    helperSource.includes("export function resolvePreferredAnswerText"),
    "card-insight-text should own preferred answer resolution"
  );
  assert.ok(
    helperSource.includes("export function sanitizeTitle"),
    "card-insight-text should own title sanitization"
  );
  assert.ok(
    helperSource.includes("export function softenAdviceTone"),
    "card-insight-text should own advice tone normalization"
  );
  assert.ok(
    helperSource.includes("export function buildSurveyAnswerLookup"),
    "card-insight-text should own survey answer lookup assembly"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "card_insights_imports_text_helpers",
          "card_insights_reexports_text_contract",
          "text_helper_module_owns_answer_and_copy_logic",
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
  console.error("[qa:b2b:report-summary-card-insight-text] FAIL", error);
  process.exit(1);
}
