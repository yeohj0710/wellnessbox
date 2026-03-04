/* eslint-disable no-console */
import assert from "node:assert/strict";

import * as reportPayloadMedicationModule from "@/lib/b2b/report-payload-medication";

const reportPayloadMedication = (
  reportPayloadMedicationModule as unknown as { default?: unknown }
).default ?? reportPayloadMedicationModule;
const resolveReportMedicationRows = (
  reportPayloadMedication as {
    resolveReportMedicationRows?: (input: {
      employeeId: string;
      periodKey: string;
      latestSnapshotId: string | null;
      normalizedJson: unknown;
      rawJson: unknown;
    }) => Promise<{ rows: Array<{ medicationName: string; date: string | null }> }>;
  }
).resolveReportMedicationRows;

function buildMedicationPayload(rows: Array<Record<string, unknown>>) {
  return {
    data: {
      list: rows,
    },
  };
}

async function runRootRawEnvelopeCase() {
  assert.equal(
    typeof resolveReportMedicationRows,
    "function",
    "resolveReportMedicationRows export must exist"
  );
  const rows = [
    {
      medDate: "20251201",
      pharmNm: "A Clinic",
      medicineNm: "drug-a",
      CMPN_NM: "ingredient-a",
    },
    {
      medDate: "20251101",
      pharmNm: "B Clinic",
      diagType: "outpatient",
      presCnt: "1",
    },
    {
      medDate: "20251001",
      pharmNm: "C Pharmacy",
      medicineNm: "drug-c",
      CMPN_NM: "ingredient-c",
    },
    {
      medDate: "20250901",
      pharmNm: "D Pharmacy",
      medicineNm: "drug-d",
      CMPN_NM: "ingredient-d",
    },
  ];

  const result = await resolveReportMedicationRows!({
    employeeId: "qa-employee",
    periodKey: "2026-03",
    latestSnapshotId: null,
    normalizedJson: { medication: { list: [] } },
    rawJson: {
      raw: {
        medication: buildMedicationPayload(rows),
      },
    },
  });

  assert.equal(result.rows.length, 3, "report medication rows must be capped to 3");
  assert.equal(result.rows[0]?.date, "20251201");
  assert.ok(
    result.rows[0]?.medicationName.includes("drug-a"),
    "medication name should include product name from raw payload"
  );
  assert.ok(
    result.rows[0]?.medicationName.includes("ingredient-a"),
    "medication name should include ingredient fields from raw payload"
  );
  assert.equal(
    result.rows.some((row) => row.medicationName.includes("drug-d")),
    false,
    "older 4th visit should be excluded by recent-3 cap"
  );
  console.log("[qa:report-medication-raw-envelope] PASS root.raw envelope case");
}

async function runDataRawEnvelopeCase() {
  const rows = [
    {
      medDate: "20260201",
      pharmNm: "E Pharmacy",
      medicineNm: "drug-e",
      CMPN_NM: "ingredient-e",
    },
  ];

  const result = await resolveReportMedicationRows!({
    employeeId: "qa-employee",
    periodKey: "2026-03",
    latestSnapshotId: null,
    normalizedJson: { medication: { list: [] } },
    rawJson: {
      data: {
        raw: {
          medication: buildMedicationPayload(rows),
        },
      },
    },
  });

  assert.equal(result.rows.length, 1);
  assert.ok(
    result.rows[0]?.medicationName.includes("drug-e"),
    "resolver should support legacy data.raw envelope format"
  );
  console.log("[qa:report-medication-raw-envelope] PASS data.raw envelope case");
}

async function runMedicalFallbackEnvelopeCase() {
  const rows = [
    {
      medDate: "20260301",
      pharmNm: "F Pharmacy",
      medicineNm: "drug-f",
      CMPN_NM: "ingredient-f",
    },
  ];

  const result = await resolveReportMedicationRows!({
    employeeId: "qa-employee",
    periodKey: "2026-03",
    latestSnapshotId: null,
    normalizedJson: {
      medication: {
        list: [
          {
            medDate: "20260301",
            pharmNm: "F Pharmacy",
            diagType: "pharmacy",
          },
        ],
      },
    },
    rawJson: {
      raw: {
        medical: buildMedicationPayload(rows),
      },
    },
  });

  assert.equal(result.rows.length, 1);
  assert.ok(
    result.rows[0]?.medicationName.includes("drug-f"),
    "resolver should reuse raw medical payload when medication payload is absent"
  );
  console.log("[qa:report-medication-raw-envelope] PASS raw medical fallback case");
}

async function runSameDateNamedPriorityCase() {
  const rows = [
    {
      medDate: "20251201",
      pharmNm: "A Clinic",
      diagType: "outpatient",
      presCnt: "1",
    },
    {
      medDate: "20251031",
      pharmNm: "B Clinic",
      diagType: "outpatient",
      presCnt: "1",
    },
    {
      medDate: "20250522",
      pharmNm: "C Clinic",
      diagType: "outpatient",
      presCnt: "1",
    },
    {
      medDate: "20250522",
      pharmNm: "C Pharmacy",
      medicineNm: "drug-z",
      CMPN_NM: "ingredient-z",
      presCnt: "1",
    },
  ];

  const result = await resolveReportMedicationRows!({
    employeeId: "qa-employee",
    periodKey: "2026-03",
    latestSnapshotId: null,
    normalizedJson: { medication: { list: [] } },
    rawJson: {
      raw: {
        medication: buildMedicationPayload(rows),
      },
    },
  });

  assert.equal(result.rows.length, 3);
  assert.ok(
    result.rows.some((row) => row.medicationName.includes("drug-z")),
    "recent rows with same date should prioritize named medication visits"
  );
  console.log("[qa:report-medication-raw-envelope] PASS same-date named priority case");
}

async function run() {
  await runRootRawEnvelopeCase();
  await runDataRawEnvelopeCase();
  await runMedicalFallbackEnvelopeCase();
  await runSameDateNamedPriorityCase();
  console.log("[qa:report-medication-raw-envelope] ALL PASS");
}

run().catch((error) => {
  console.error("[qa:report-medication-raw-envelope] FAIL", error);
  process.exit(1);
});
