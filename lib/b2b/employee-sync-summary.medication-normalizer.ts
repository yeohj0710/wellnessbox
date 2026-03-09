import { type NhisFetchRoutePayload } from "@/lib/server/hyphen/fetch-contract";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const MEDICATION_NAMES_PER_VISIT_LIMIT = 8;
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
  "상품명",
  "상품",
  "성분",
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
const MEDICAL_PHARMACY_HINT_KEYS = [
  "diagType",
  "detail_diagType",
  "drug_diagType",
  "visitType",
  "pharmNm",
  "hospitalNm",
] as const;

function toText(value: unknown) {
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
  return 0;
}

function resolveMedicationDateScore(row: Record<string, unknown>): number {
  for (const key of MEDICATION_DATE_KEYS) {
    const score = parseSortableDateScore(row[key]);
    if (score > 0) return score;
  }
  return 0;
}

function resolveMedicationDateText(row: Record<string, unknown>): string | null {
  for (const key of MEDICATION_DATE_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function pickFirstText(
  row: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function extractMedicationName(row: Record<string, unknown>): string | null {
  for (const key of MEDICATION_NAME_KEYS) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function rowHasMedicationName(row: unknown): boolean {
  const record = asRecord(row);
  if (!record) return false;
  return !!extractMedicationName(record);
}

export function hasMedicationNameInRows(rows: unknown[]) {
  return rows.some((row) => rowHasMedicationName(row));
}

export function hasMedicalMedicationHint(row: unknown) {
  const record = asRecord(row);
  if (!record) return false;

  const presCntText = toText(record.presCnt);
  if (presCntText && Number(presCntText) > 0) return true;

  const medCntText = toText(record.medCnt);
  if (medCntText && Number(medCntText) > 0) return true;

  for (const key of MEDICAL_PHARMACY_HINT_KEYS) {
    const text = (toText(record[key]) || "").toLowerCase();
    if (!text) continue;
    if (
      text.includes("약국") ||
      text.includes("처방") ||
      text.includes("조제") ||
      text.includes("pharmacy") ||
      text.includes("prescription")
    ) {
      return true;
    }
  }
  return false;
}

function compareMedicationRows(
  leftRecord: Record<string, unknown>,
  rightRecord: Record<string, unknown>
) {
  const leftHasName = rowHasMedicationName(leftRecord);
  const rightHasName = rowHasMedicationName(rightRecord);
  if (leftHasName !== rightHasName) {
    return rightHasName ? 1 : -1;
  }
  const dateDiff =
    resolveMedicationDateScore(rightRecord) - resolveMedicationDateScore(leftRecord);
  if (dateDiff !== 0) return dateDiff;
  return JSON.stringify(leftRecord).localeCompare(JSON.stringify(rightRecord), "ko");
}

function visitGroupHasMedicationName(rows: Record<string, unknown>[]) {
  return rows.some((row) => rowHasMedicationName(row));
}

function resolveMedicationVisitKey(
  row: Record<string, unknown>,
  fallbackIndex: number
) {
  const date = resolveMedicationDateText(row) ?? "";
  const hospital = pickFirstText(row, MEDICATION_HOSPITAL_KEYS) ?? "";
  const visitType = pickFirstText(row, MEDICATION_VISIT_TYPE_KEYS) ?? "";
  if (!date && !hospital && !visitType) return `unknown-${fallbackIndex}`;
  return `${date}|${hospital}|${visitType}`;
}

function mergeMedicationRowsByVisit(rows: unknown[]) {
  if (rows.length === 0) return rows;
  const byVisit = new Map<
    string,
    {
      rows: Record<string, unknown>[];
      score: number;
      firstIndex: number;
    }
  >();

  rows.forEach((row, index) => {
    const record = asRecord(row);
    if (!record) return;
    const key = resolveMedicationVisitKey(record, index);
    const current = byVisit.get(key);
    const score = resolveMedicationDateScore(record);
    if (!current) {
      byVisit.set(key, { rows: [record], score, firstIndex: index });
      return;
    }
    current.rows.push(record);
    if (score > current.score) current.score = score;
  });

  const selectedVisits = [...byVisit.entries()].sort((left, right) => {
    const leftHasName = visitGroupHasMedicationName(left[1].rows);
    const rightHasName = visitGroupHasMedicationName(right[1].rows);
    if (leftHasName !== rightHasName) return rightHasName ? 1 : -1;
    const scoreDiff = right[1].score - left[1].score;
    if (scoreDiff !== 0) return scoreDiff;
    return left[1].firstIndex - right[1].firstIndex;
  });

  return selectedVisits.map(([, group]) => {
    const representative = [...group.rows].sort(compareMedicationRows)[0] ?? {};
    const names = [...new Set(group.rows.map(extractMedicationName).filter(Boolean))];
    if (names.length === 0) return representative;
    const previewNames = names.slice(0, MEDICATION_NAMES_PER_VISIT_LIMIT);
    const suffix =
      names.length > MEDICATION_NAMES_PER_VISIT_LIMIT
        ? ` ??${names.length - MEDICATION_NAMES_PER_VISIT_LIMIT}`
        : "";
    return {
      ...representative,
      medicineNm: `${previewNames.join(", ")}${suffix}`.trim(),
    };
  });
}

export function normalizeMedicationContainer(value: unknown) {
  if (Array.isArray(value)) {
    return mergeMedicationRowsByVisit(value);
  }
  const record = asRecord(value);
  if (!record) return value;
  const rows = asArray(record.list ?? record.rows ?? record.items ?? record.history);
  if (rows.length === 0) return value;
  const limitedRows = mergeMedicationRowsByVisit(rows);
  const summary = asRecord(record.summary) ?? {};
  return {
    ...record,
    list: limitedRows,
    summary: {
      ...summary,
      totalCount: limitedRows.length,
    },
  };
}

export function resolveMedicationRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medication = normalized?.medication;
  if (Array.isArray(medication)) return medication;
  const medicationRecord = asRecord(medication);
  if (!medicationRecord) return null;
  if (Array.isArray(medicationRecord.list)) return medicationRecord.list;
  if (Array.isArray(medicationRecord.rows)) return medicationRecord.rows;
  if (Array.isArray(medicationRecord.items)) return medicationRecord.items;
  if (Array.isArray(medicationRecord.history)) return medicationRecord.history;
  if (
    "list" in medicationRecord ||
    "rows" in medicationRecord ||
    "items" in medicationRecord ||
    "history" in medicationRecord
  ) {
    return [];
  }
  return null;
}

export function resolveMedicalRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medicalRaw = normalized?.medical;
  if (Array.isArray(medicalRaw)) return medicalRaw;
  const medicalRecord = asRecord(medicalRaw);
  if (!medicalRecord) return null;
  if (Array.isArray(medicalRecord.list)) return medicalRecord.list;
  if (Array.isArray(medicalRecord.rows)) return medicalRecord.rows;
  if (Array.isArray(medicalRecord.items)) return medicalRecord.items;
  if (Array.isArray(medicalRecord.history)) return medicalRecord.history;
  if (
    "list" in medicalRecord ||
    "rows" in medicalRecord ||
    "items" in medicalRecord ||
    "history" in medicalRecord
  ) {
    return [];
  }
  return null;
}

export function payloadHasMedicationNames(payload: NhisFetchRoutePayload) {
  if (!payload.ok) return false;
  const rows = resolveMedicationRows(payload.data?.normalized ?? null);
  if (rows == null) return false;
  return hasMedicationNameInRows(rows);
}
