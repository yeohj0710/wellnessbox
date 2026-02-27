import "server-only";

import { normalizeCheckupListPayload, normalizeCheckupOverviewPayload, normalizeCheckupYearlyPayload } from "@/lib/server/hyphen/normalize-checkup";
import { normalizeHealthAge } from "@/lib/server/hyphen/normalize-health-age";
import { normalizeRecommendationSummary } from "@/lib/server/hyphen/normalize-recommendation";
import { extractRecentLines } from "@/lib/server/hyphen/normalize-shared";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";
import type {
  NormalizeNhisPayloadInput,
  NormalizedNhisPayload,
  NhisCheckupSummary,
  NhisHealthAgeSummary,
  NhisListSummary,
  NhisRecommendationSummary,
  NhisRow,
} from "@/lib/server/hyphen/normalize-types";

export type {
  NhisCheckupSummary,
  NhisHealthAgeSummary,
  NhisListSummary,
  NhisRecommendationSummary,
  NhisRow,
  NormalizedNhisPayload,
};

const MEDICATION_RECENT_LIMIT = 3;
const MEDICATION_NAMES_PER_VISIT_LIMIT = 8;
const MEDICATION_DATE_KEYS = [
  "diagDate",
  "medDate",
  "date",
  "TRTM_YMD",
  "PRSC_YMD",
  "detail_TRTM_YMD",
  "detail_PRSC_YMD",
  "drug_TRTM_YMD",
  "drug_PRSC_YMD",
  "prescribedDate",
  "prescDate",
  "medicationDate",
  "diagSdate",
] as const;
const MEDICATION_HOSPITAL_KEYS = [
  "pharmNm",
  "hospitalNm",
  "hospitalName",
  "hospital",
  "clinicName",
  "hspNm",
  "detail_HSP_NM",
  "drug_HSP_NM",
  "HSP_NM",
  "clinicNm",
] as const;
const MEDICATION_VISIT_TYPE_KEYS = [
  "diagType",
  "detail_diagType",
  "drug_diagType",
  "visitType",
] as const;
const MEDICATION_NAME_KEYS = [
  "medicineNm",
  "medicine",
  "drugName",
  "drugNm",
  "medNm",
  "medicineName",
  "prodName",
  "drug_MEDI_PRDC_NM",
  "MEDI_PRDC_NM",
  "drug_CMPN_NM",
  "detail_CMPN_NM",
  "CMPN_NM",
  "drug_CMPN_NM_2",
  "detail_CMPN_NM_2",
  "CMPN_NM_2",
  "mediPrdcNm",
  "drugMediPrdcNm",
  "cmpnNm",
  "drugCmpnNm",
  "detailCmpnNm",
  "cmpnNm2",
  "drugCmpnNm2",
  "detailCmpnNm2",
  "복용약",
  "약품명",
  "약품",
  "성분",
] as const;

function toText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseSortableDateScore(value: unknown): number {
  const text = toText(value);
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 6) {
    const score = Number(`${digits.slice(0, 6)}01`);
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 4) {
    const score = Number(`${digits.slice(0, 4)}0101`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function resolveMedicationDateScore(row: NhisRow): number {
  for (const key of MEDICATION_DATE_KEYS) {
    const score = parseSortableDateScore(row[key]);
    if (score > 0) return score;
  }
  return 0;
}

function resolveMedicationDateText(row: NhisRow): string | null {
  for (const key of MEDICATION_DATE_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function pickFirstText(row: NhisRow, keys: readonly string[]): string | null {
  for (const key of keys) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function extractMedicationName(row: NhisRow): string | null {
  for (const key of MEDICATION_NAME_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function hasMedicationName(row: NhisRow): boolean {
  return !!extractMedicationName(row);
}

function compareMedicationRows(left: NhisRow, right: NhisRow) {
  const leftHasMedication = hasMedicationName(left);
  const rightHasMedication = hasMedicationName(right);
  if (leftHasMedication !== rightHasMedication) {
    return rightHasMedication ? 1 : -1;
  }

  const dateDiff =
    resolveMedicationDateScore(right) - resolveMedicationDateScore(left);
  if (dateDiff !== 0) return dateDiff;
  return JSON.stringify(left).localeCompare(JSON.stringify(right), "ko");
}

function resolveMedicationVisitKey(row: NhisRow, fallbackIndex: number): string {
  const date = resolveMedicationDateText(row) ?? "";
  const hospital = pickFirstText(row, MEDICATION_HOSPITAL_KEYS) ?? "";
  const visitType = pickFirstText(row, MEDICATION_VISIT_TYPE_KEYS) ?? "";
  if (!date && !hospital && !visitType) {
    return `unknown-${fallbackIndex}`;
  }
  return `${date}|${hospital}|${visitType}`;
}

function limitRecentMedicationRows(rows: NhisRow[], maxRows: number): NhisRow[] {
  if (rows.length === 0) return rows;
  const byVisit = new Map<
    string,
    { rows: NhisRow[]; score: number; firstIndex: number }
  >();
  rows.forEach((row, index) => {
    const visitKey = resolveMedicationVisitKey(row, index);
    const current = byVisit.get(visitKey);
    const score = resolveMedicationDateScore(row);
    if (!current) {
      byVisit.set(visitKey, {
        rows: [row],
        score,
        firstIndex: index,
      });
      return;
    }
    current.rows.push(row);
    if (score > current.score) current.score = score;
  });

  const selectedVisits = [...byVisit.entries()]
    .sort((left, right) => {
      const scoreDiff = right[1].score - left[1].score;
      if (scoreDiff !== 0) return scoreDiff;
      return left[1].firstIndex - right[1].firstIndex;
    })
    .slice(0, maxRows);

  return selectedVisits.map(([, group]) => {
    const representative = [...group.rows].sort(compareMedicationRows)[0] ?? {};
    const names = [...new Set(group.rows.map(extractMedicationName).filter(Boolean))];
    if (names.length === 0) return representative;
    const previewNames = names.slice(0, MEDICATION_NAMES_PER_VISIT_LIMIT);
    const suffix =
      names.length > MEDICATION_NAMES_PER_VISIT_LIMIT
        ? ` 외 ${names.length - MEDICATION_NAMES_PER_VISIT_LIMIT}`
        : "";
    return {
      ...representative,
      medicineNm: `${previewNames.join(", ")}${suffix}`.trim(),
    };
  });
}

function parseCheckupYear(value: unknown): number {
  const text = toText(value);
  if (!text) return 0;
  const match = text.match(/(19\d{2}|20\d{2})/);
  if (!match) return 0;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : 0;
}

function parseCheckupMonthDay(value: unknown): { month: number; day: number } {
  const text = toText(value);
  if (!text) return { month: 0, day: 0 };
  const match = text.match(/(\d{1,2})[./-](\d{1,2})/);
  if (!match) return { month: 0, day: 0 };
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return { month: 0, day: 0 };
  }
  return { month, day };
}

function resolveCheckupOverviewScore(row: NhisRow): number {
  const year =
    parseCheckupYear(row.year) ||
    parseCheckupYear(row.checkupDate) ||
    parseCheckupYear(row.date);
  const { month, day } = parseCheckupMonthDay(row.checkupDate ?? row.date);
  return year * 10000 + month * 100 + day;
}

function selectLatestCheckupOverviewRows(rows: NhisRow[]): NhisRow[] {
  if (rows.length === 0) return rows;
  const scored = rows.map((row) => ({
    row,
    score: resolveCheckupOverviewScore(row),
  }));
  const bestScore = scored.reduce(
    (max, item) => (item.score > max ? item.score : max),
    0
  );
  if (bestScore <= 0) return rows;
  return scored
    .filter((item) => item.score === bestScore)
    .map((item) => item.row);
}

export function normalizeNhisPayload(input: NormalizeNhisPayloadInput): NormalizedNhisPayload {
  const medical = normalizeTreatmentPayload(input.medical);
  const medicationRaw = normalizeTreatmentPayload(input.medication);
  const useMedicalMedicationFallback =
    medicationRaw.list.length === 0 && medical.list.length > 0;
  const medicationRowsSource = useMedicalMedicationFallback
    ? medical.list
    : medicationRaw.list;
  const medicationSourceTag = useMedicalMedicationFallback
    ? "medical-fallback"
    : "medication";
  const medicationRows = limitRecentMedicationRows(
    medicationRowsSource,
    MEDICATION_RECENT_LIMIT
  );
  const medication = {
    ...medicationRaw,
    list: medicationRows,
    summary: {
      ...medicationRaw.summary,
      totalCount: medicationRows.length,
      recentLines: extractRecentLines(medicationRows),
      source: medicationSourceTag,
    },
  };

  const checkupListNormalized = normalizeCheckupListPayload(input.checkupList);
  const checkupYearlyRows = normalizeCheckupYearlyPayload(input.checkupYearly);
  const checkupOverviewRows = selectLatestCheckupOverviewRows(
    normalizeCheckupOverviewPayload(input.checkupOverview)
  );

  const recommendation = normalizeRecommendationSummary({
    medicalRows: medical.list,
    medicationRows,
    checkupListRows: checkupListNormalized.rows,
    checkupYearlyRows,
    checkupOverviewRows,
  });

  return {
    medical,
    medication,
    checkup: {
      list: checkupListNormalized.rows,
      yearly: checkupYearlyRows,
      overview: checkupOverviewRows,
      summary: {
        listCount: checkupListNormalized.rows.length,
        yearlyCount: checkupYearlyRows.length,
        overviewCount: checkupOverviewRows.length,
        peopleCount: checkupListNormalized.peopleCount,
        yearCount: checkupListNormalized.yearCount,
        recentLines: extractRecentLines(
          [...checkupOverviewRows, ...checkupListNormalized.rows, ...checkupYearlyRows],
          8
        ),
      },
    },
    healthAge: normalizeHealthAge(input.healthAge),
    recommendation,
  };
}
