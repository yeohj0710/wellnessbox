/* eslint-disable no-console */
import assert from "node:assert/strict";

import { extractMedicationRows } from "@/lib/b2b/report-payload-health-medication";

function isDerivedLabel(name: string) {
  return name === "약국 조제" || name.endsWith(" 진료");
}

function runNamedRowsCase() {
  const normalized = {
    medication: {
      list: [
        {
          medDate: "20251215",
          pharmNm: "연세대학교 의과대학 용인세브란스병원",
          diagType: "일반외래",
          presCnt: "1",
        },
        {
          medDate: "20251112",
          pharmNm: "서울손내과의원",
          diagType: "일반외래",
          presCnt: "1",
        },
        {
          medDate: "20230308",
          pharmNm: "송도제일약국",
          medicineNm: "코대원정 (Codaewon Tab.)",
          presCnt: "1",
        },
        {
          medDate: "20221221",
          pharmNm: "진온누리약국",
          medicineNm: "레마이드정 (Remide Tab.)",
          presCnt: "1",
        },
        {
          medDate: "20220525",
          pharmNm: "정문대학약국",
          medicineNm: "알레그라디정 (Allegra D Tab.)",
          presCnt: "1",
        },
        {
          medDate: "20211201",
          pharmNm: "남부약국",
          medicineNm: "베아스타정",
          presCnt: "1",
        },
      ],
    },
  };

  const extracted = extractMedicationRows(normalized);
  assert.equal(extracted.containerState, "present");
  assert.ok(extracted.rows.length >= 4, "named rows should not be truncated to 3");
  assert.ok(
    extracted.rows.some((row) => row.date === "20211201"),
    "old named medication rows should remain in list"
  );
  assert.ok(
    extracted.rows.some((row) => !isDerivedLabel(row.medicationName)),
    "when named medication rows exist, at least one named medication row should be preserved"
  );
  console.log("[qa:report-medication-all-rows] PASS named rows case");
}

function runFallbackCase() {
  const normalized = {
    medication: {
      list: [
        {
          medDate: "20260101",
          pharmNm: "서울손내과의원",
          diagType: "일반외래",
          presCnt: "1",
        },
      ],
    },
  };

  const extracted = extractMedicationRows(normalized);
  assert.equal(extracted.containerState, "present");
  assert.equal(extracted.rows.length, 1);
  assert.ok(
    isDerivedLabel(extracted.rows[0]?.medicationName ?? ""),
    "if named medication rows are absent, derived labels should still be returned"
  );
  console.log("[qa:report-medication-all-rows] PASS fallback case");
}

function runMedCountFallbackCase() {
  const normalized = {
    medication: {
      list: [
        {
          medDate: "20260102",
          pharmNm: "A Clinic",
          diagType: "outpatient",
          presCnt: "0",
          medCnt: "1",
        },
        {
          medDate: "20260101",
          pharmNm: "B Clinic",
          diagType: "outpatient",
          presCnt: "1",
        },
      ],
    },
  };

  const extracted = extractMedicationRows(normalized);
  assert.ok(
    extracted.rows.some((row) => row.date === "20260102"),
    "rows with presCnt=0 and medCnt>0 should still be treated as valid visits"
  );
  console.log("[qa:report-medication-all-rows] PASS medCnt fallback case");
}

function run() {
  runNamedRowsCase();
  runFallbackCase();
  runMedCountFallbackCase();
  console.log("[qa:report-medication-all-rows] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:report-medication-all-rows] FAIL", error);
  process.exit(1);
}
