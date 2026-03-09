import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXECUTOR_PATH = path.join(ROOT, "lib/server/hyphen/fetch-executor.ts");
const HELPER_PATH = path.join(
  ROOT,
  "lib/server/hyphen/fetch-executor.medication-backfill-helpers.ts"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const executorSource = read(EXECUTOR_PATH);
  const helperSource = read(HELPER_PATH);
  const checks: string[] = [];

  assert.match(
    executorSource,
    /from "@\/lib\/server\/hyphen\/fetch-executor\.medication-backfill-helpers"/,
    "fetch-executor must import medication backfill helpers."
  );
  checks.push("executor_imports_medication_backfill_helpers");

  const forbiddenExecutorTokens = [
    "function resolveMedicationDateText(",
    "function normalizeMedicationDateToYmd(",
    "function collectTreatmentRows(",
    "async function fetchMedicationBackfillPayloads(input: {",
  ];
  for (const token of forbiddenExecutorTokens) {
    assert.ok(
      !executorSource.includes(token),
      `fetch-executor should not inline token after extraction: ${token}`
    );
  }
  checks.push("executor_keeps_medication_helpers_out");

  const requiredHelperTokens = [
    "export function resolveMedicationDateText(",
    "export function payloadHasMedicationNames(",
    "export function collectRecentMedicalVisitDates(",
    "export function buildExactDateMedicationPayload(",
    "export function buildMonthRangeMedicationPayload(",
    "export async function fetchMedicationBackfillPayloads(",
    "fromDate: date",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `medication backfill helper module must own token: ${token}`
    );
  }
  checks.push("helper_module_owns_medication_backfill_logic");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
