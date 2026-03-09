/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const payloadSource = read("lib/b2b/report-payload.ts");
  const helperSource = read("lib/b2b/report-payload-survey.ts");

  assert.ok(
    payloadSource.includes('from "@/lib/b2b/report-payload-survey"'),
    "report-payload.ts should import survey helper module"
  );

  const forbiddenPayloadTokens = [
    "function getSurveyQuestionLookupByKey(",
    "function splitAnswerTokens(",
    "function resolveSurveyQuestionText(",
    "function normalizeSurveyAnswerText(",
    "async function findBestSurveyByPeriodOrFallback(",
    "function shouldPreferFallbackWellness(",
    "function computeFallbackWellnessFromSurvey(",
  ];
  for (const token of forbiddenPayloadTokens) {
    assert.ok(
      !payloadSource.includes(token),
      `report-payload.ts should not inline survey helper token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "export function resolveSurveyQuestionText(",
    "export function normalizeSurveyAnswerText(",
    "export async function findBestSurveyByPeriodOrFallback(",
    "export function shouldPreferFallbackWellness(",
    "export function computeFallbackWellnessFromSurvey(",
    "function getSurveyQuestionLookupByKey(",
    "function splitAnswerTokens(",
    "pickMostCompleteSurveyResponse(",
    "computeWellnessResult(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `report-payload-survey.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_payload_imports_survey_helper_module",
          "report_payload_keeps_survey_rules_out_of_entrypoint",
          "survey_helper_module_owns_lookup_normalization_and_fallback_rules",
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
  console.error("[qa:b2b:report-payload-survey-helpers] FAIL", error);
  process.exit(1);
}
