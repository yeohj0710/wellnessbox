import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const NORMALIZER_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-summary.normalizer.ts"
);
const SUPPORT_PATH = path.resolve(
  ROOT_DIR,
  "lib/b2b/employee-sync-summary.medication-normalizer.ts"
);

function run() {
  const normalizerSource = fs.readFileSync(NORMALIZER_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    normalizerSource,
    /employee-sync-summary\.medication-normalizer/,
    "employee sync summary normalizer must import medication normalizer helpers."
  );
  checks.push("normalizer_imports_medication_support");

  for (const token of [
    "const MEDICATION_NAME_KEYS =",
    "const MEDICATION_HOSPITAL_KEYS =",
    "function mergeMedicationRowsByVisit(",
    "function normalizeMedicationContainer(",
    "function resolveMedicationRows(",
    "function resolveMedicalRows(",
  ]) {
    assert.ok(
      !normalizerSource.includes(token),
      `[qa:b2b:employee-sync-summary-medication-normalizer] employee-sync-summary.normalizer.ts should not keep inline medication helper token: ${token}`
    );
  }
  checks.push("normalizer_no_longer_keeps_inline_medication_helpers");

  for (const token of [
    "export function hasMedicationNameInRows(",
    "export function hasMedicalMedicationHint(",
    "export function normalizeMedicationContainer(",
    "export function resolveMedicationRows(",
    "export function resolveMedicalRows(",
    "export function payloadHasMedicationNames(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:b2b:employee-sync-summary-medication-normalizer] medication normalizer module missing token: ${token}`
    );
  }
  checks.push("medication_support_owns_medication_row_normalization");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
