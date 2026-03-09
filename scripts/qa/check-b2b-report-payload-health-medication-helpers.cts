/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const extractionSource = read("lib/b2b/report-payload-health-medication.ts");
  const helperSource = read("lib/b2b/report-payload-health-medication-helpers.ts");

  assert.ok(
    extractionSource.includes(
      'from "@/lib/b2b/report-payload-health-medication-helpers"'
    ),
    "report-payload-health-medication.ts should import shared helper module"
  );

  const forbiddenExtractionTokens = [
    "function parseSortableDateScore(",
    "function normalizeMedicationNameText(",
    "function normalizeMedicationEffectText(",
    "function hasPositiveSignal(",
    "function resolveRowsFromContainer(",
  ];
  for (const token of forbiddenExtractionTokens) {
    assert.ok(
      !extractionSource.includes(token),
      `report-payload-health-medication.ts should not inline helper token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "export const MEDICATION_NAME_KEYS",
    "export const MEDICATION_HOSPITAL_KEYS",
    "export const MEDICATION_EFFECT_KEYS",
    "export function collectMedicationNamesByKeys(",
    "export function collectMedicationEffectsByKeys(",
    "export function resolveMedicationFallbackName(",
    "export function resolveMedicationDateScore(",
    "export function resolveMedicationVisitKey(",
    "export function resolveRowsFromContainer(",
    "export function hasNamedEntry(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `report-payload-health-medication-helpers.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "medication_extractor_imports_helper_module",
          "medication_extractor_keeps_row_helpers_out",
          "medication_helper_module_owns_parsing_constants_and_utilities",
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
  console.error("[qa:b2b:report-payload-health-medication-helpers] FAIL", error);
  process.exit(1);
}
