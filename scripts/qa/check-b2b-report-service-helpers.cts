import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVICE_PATH = path.join(ROOT, "lib/b2b/report-service.ts");
const HELPER_PATH = path.join(ROOT, "lib/b2b/report-service.helpers.ts");

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const serviceSource = read(SERVICE_PATH);
  const helperSource = read(HELPER_PATH);
  const checks: string[] = [];

  assert.match(
    serviceSource,
    /from "@\/lib\/b2b\/report-service\.helpers"/,
    "report-service must import shared helper module."
  );
  checks.push("service_imports_helper_module");

  const forbiddenServiceTokens = [
    "function parseStoredLayout(",
    "function resolvePayloadVersion(",
    "function parseMaybeJsonRecord(",
    "function resolveRowsLengthFromContainer(",
  ];
  for (const token of forbiddenServiceTokens) {
    assert.ok(
      !serviceSource.includes(token),
      `report-service should not inline helper token after extraction: ${token}`
    );
  }
  checks.push("service_keeps_shared_helpers_out");

  const requiredHelperTokens = [
    "export function asJsonValue(",
    "export function parseStoredLayout(",
    "export function isCurrentLayoutVersion(",
    "export function resolveReportHistoryPerPeriodLimit(",
    "export function resolvePayloadVersion(",
    "export function hasAnyTreatmentRows(",
    "export function resolveMedicationRowsLengthFromReportPayload(",
  ];
  for (const token of requiredHelperTokens) {
    assert.ok(
      helperSource.includes(token),
      `report-service helper module must own token: ${token}`
    );
  }
  checks.push("helper_module_owns_payload_and_layout_helpers");

  assert.ok(
    serviceSource.includes("shouldRegenerateEmptyMedicationReport"),
    "report-service should keep medication recovery decision wrapper in the service layer"
  );
  checks.push("service_keeps_medication_recovery_gate");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
