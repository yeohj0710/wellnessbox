import { asArray, asRecord, toText } from "@/lib/b2b/report-payload-shared";

export type MedicationRow = {
  medicationName: string;
  hospitalName: string | null;
  date: string | null;
  dosageDay: string | null;
  medicationEffects: string[];
};

export const MEDICATION_DERIVED_PHARMACY_LABEL = "약국 조제";
export const MEDICATION_NAME_KEYS = [
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
export const MEDICATION_HOSPITAL_KEYS = [
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
export const MEDICATION_VISIT_TYPE_KEYS = [
  "diagType",
  "detail_diagType",
  "drug_diagType",
  "visitType",
] as const;
export const MEDICATION_DATE_KEYS = [
  "diagDate",
  "medDate",
  "date",
  "rxDate",
  "prescribeDate",
  "prscDate",
  "takeDate",
  "TRTM_YMD",
  "detail_PRSC_YMD",
  "detail_TRTM_YMD",
  "drug_PRSC_YMD",
  "drug_TRTM_YMD",
  "PRSC_YMD",
  "diagSdate",
  "medicationDate",
] as const;
export const MEDICATION_DOSAGE_KEYS = [
  "dosageDay",
  "period",
  "takeDay",
  "dayCount",
  "admDay",
  "medCnt",
  "presCnt",
  "detail_DOSAGE_DAY",
  "drug_DOSAGE_DAY",
] as const;
export const MEDICATION_EFFECT_KEYS = [
  "medicineEffect",
  "effect",
  "effectNm",
  "drug_KPIC_EFMD",
  "detail_KPIC_EFMD",
  "KPIC_EFMD",
  "drug_EFFT_EFT_CNT",
  "detail_EFFT_EFT_CNT",
  "EFFT_EFT_CNT",
  "efftEftCnt",
  "효능",
  "효과",
] as const;

function parseSortableDateScore(value: unknown) {
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

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return null;
}

export function pickFirstByKeys(
  row: Record<string, unknown>,
  keys: readonly string[]
) {
  for (const key of keys) {
    const text = toText(row[key]);
    if (text) return text;
  }
  return null;
}

function normalizeMedicationNameText(value: string | null) {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (text === "-" || text === "없음") return null;
  return text;
}

export function collectMedicationNamesByKeys(
  row: Record<string, unknown>,
  keys: readonly string[]
) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const text = normalizeMedicationNameText(toText(row[key]));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    names.push(text);
  }
  return names;
}

function normalizeMedicationEffectText(value: string | null) {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (text === "-" || text === "없음" || text === "null") return null;
  return text;
}

export function collectMedicationEffectsByKeys(
  row: Record<string, unknown>,
  keys: readonly string[]
) {
  const effects: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const text = normalizeMedicationEffectText(toText(row[key]));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    effects.push(text);
  }
  return effects;
}

function hasPositiveSignal(value: string | null) {
  if (!value) return false;
  const digits = value.replace(/[^\d.-]/g, "");
  if (!digits) return true;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return true;
  return numeric > 0;
}

function normalizeVisitTypeLabel(value: string | null) {
  const text = (value ?? "").trim();
  return text.length > 0 ? text : "일반외래";
}

export function isLikelyPharmacyVisit(input: {
  visitType: string | null;
  hospitalName: string | null;
}) {
  const visitType = (input.visitType ?? "").trim();
  const hospitalName = (input.hospitalName ?? "").trim();
  return visitType.includes("약국") || hospitalName.includes("약국");
}

export function isDerivedMedicationLabel(name: string | null | undefined) {
  const text = (name ?? "").trim();
  if (!text) return true;
  return text === MEDICATION_DERIVED_PHARMACY_LABEL || text.endsWith(" 진료");
}

export function resolveMedicationFallbackName(
  row: Record<string, unknown>,
  pharmacyVisit: boolean
) {
  const visitType = pickFirstText(
    row.diagType ?? row.detail_diagType ?? row.drug_diagType ?? row.visitType
  );
  const presCnt = pickFirstText(row.presCnt ?? row.count);
  const medCnt = pickFirstText(row.medCnt);
  const dosageDay = pickFirstText(
    row.dosageDay ?? row.dayCount ?? row.takeDay ?? row.admDay
  );
  const hasCountSignal =
    hasPositiveSignal(presCnt) ||
    hasPositiveSignal(medCnt) ||
    hasPositiveSignal(dosageDay);
  const hasTypeSignal =
    !!visitType &&
    (visitType.includes("처방") ||
      visitType.includes("투약") ||
      visitType.includes("조제") ||
      visitType.includes("외래"));
  if (!hasCountSignal && !hasTypeSignal) return null;
  if (pharmacyVisit) return MEDICATION_DERIVED_PHARMACY_LABEL;
  return `${normalizeVisitTypeLabel(visitType)} 진료`;
}

export function resolveMedicationDateScore(row: Record<string, unknown>) {
  for (const key of MEDICATION_DATE_KEYS) {
    const score = parseSortableDateScore(row[key]);
    if (score > 0) return score;
  }
  return 0;
}

export function resolveMedicationVisitKey(
  row: Record<string, unknown>,
  fallbackIndex: number
) {
  const date = pickFirstByKeys(row, MEDICATION_DATE_KEYS) ?? "";
  const hospital = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) ?? "";
  const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS) ?? "";
  if (!date && !hospital && !visitType) return `unknown-${fallbackIndex}`;
  return `${date}|${hospital}|${visitType}`;
}

export function resolveRowsFromContainer(value: unknown): Record<string, unknown>[] {
  const record = asRecord(value);
  const rows = Array.isArray(value)
    ? value
    : asArray(record?.list ?? record?.rows ?? record?.items ?? record?.history);
  const resolved: Record<string, unknown>[] = [];
  for (const item of rows) {
    const row = asRecord(item);
    if (!row) continue;
    resolved.push(row);
  }
  return resolved;
}

export function resolveVisitLimit(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized <= 0) return null;
  return normalized;
}

export function hasNamedEntry(rows: MedicationRow[]) {
  return rows.some((row) => !isDerivedMedicationLabel(row.medicationName));
}
