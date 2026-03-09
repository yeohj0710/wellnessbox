/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function run() {
  const medicationSource = read("lib/b2b/report-payload-medication.ts");
  const helperSource = read("lib/b2b/report-payload-medication-helpers.ts");

  assert.ok(
    medicationSource.includes('from "@/lib/b2b/report-payload-medication-helpers"'),
    "report-payload-medication.ts should import shared helper module"
  );

  const forbiddenMedicationTokens = [
    "function parseMaybeJson(",
    "function asParsedRecord(",
    "function resolveRawPayloadByKey(",
    "function extractMedicationRowsFromRaw(",
    "function medicationVisitKey(",
    "function mergeMedicationRows(",
    "function pickPreferredMedicationRow(",
  ];
  for (const token of forbiddenMedicationTokens) {
    assert.ok(
      !medicationSource.includes(token),
      `report-payload-medication.ts should not inline helper token after extraction: ${token}`
    );
  }

  const requiredHelperTokens = [
    "export function parseMaybeJson(",
    "export function asParsedRecord(",
    "export function resolveRawPayloadByKey(",
    "export function extractMedicationRowsFromRaw(",
    "export function medicationVisitKey(",
    "export function hasNamedMedicationRows(",
    "export function prioritizeMedicationRows(",
    "export function mergeMedicationRows(",
    "export function extractRowsFromHistorySnapshot(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `report-payload-medication-helpers.ts should own token: ${token}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "report_payload_medication_imports_helper_module",
          "report_payload_medication_keeps_raw_and_merge_helpers_out",
          "report_payload_medication_helper_module_owns_raw_and_merge_rules",
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
  console.error("[qa:b2b:report-payload-medication-helpers] FAIL", error);
  process.exit(1);
}
