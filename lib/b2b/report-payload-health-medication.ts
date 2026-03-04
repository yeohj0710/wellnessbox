import { asArray, asRecord, toText } from "@/lib/b2b/report-payload-shared";

type MedicationRow = {
  medicationName: string;
  hospitalName: string | null;
  date: string | null;
  dosageDay: string | null;
  medicationEffects: string[];
};

export type MedicationContainerState = "present" | "missing" | "unrecognized";

type ExtractMedicationRowsOptions = {
  maxVisits?: number | null;
};

const MEDICATION_DERIVED_PHARMACY_LABEL = "\uc57d\uad6d \uc870\uc81c";
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
  "\ubcf5\uc6a9\uc57d",
  "\uc57d\ud488\uba85",
  "\uc57d\ud488",
  "\uc131\ubd84",
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
const MEDICATION_DOSAGE_KEYS = [
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
const MEDICATION_EFFECT_KEYS = [
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
  "\ud6a8\ub2a5",
  "\ud6a8\uacfc",
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

function pickFirstByKeys(
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

function collectMedicationNamesByKeys(
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
  if (text === "-" || text === "\uc5c6\uc74c" || text === "null") return null;
  return text;
}

function collectMedicationEffectsByKeys(
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
  return text.length > 0 ? text : "\uc77c\ubc18\uc678\ub798";
}

function isLikelyPharmacyVisit(input: {
  visitType: string | null;
  hospitalName: string | null;
}) {
  const visitType = (input.visitType ?? "").trim();
  const hospitalName = (input.hospitalName ?? "").trim();
  return visitType.includes("\uc57d\uad6d") || hospitalName.includes("\uc57d\uad6d");
}

function isDerivedMedicationLabel(name: string | null | undefined) {
  const text = (name ?? "").trim();
  if (!text) return true;
  return text === MEDICATION_DERIVED_PHARMACY_LABEL || text.endsWith(" \uc9c4\ub8cc");
}

function resolveMedicationFallbackName(
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
    (visitType.includes("\ucc98\ubc29") ||
      visitType.includes("\ud22c\uc57d") ||
      visitType.includes("\uc870\uc81c") ||
      visitType.includes("\uc678\ub798"));
  if (!hasCountSignal && !hasTypeSignal) return null;
  if (pharmacyVisit) return MEDICATION_DERIVED_PHARMACY_LABEL;
  return `${normalizeVisitTypeLabel(visitType)} \uc9c4\ub8cc`;
}

function resolveMedicationDateScore(row: Record<string, unknown>) {
  for (const key of MEDICATION_DATE_KEYS) {
    const score = parseSortableDateScore(row[key]);
    if (score > 0) return score;
  }
  return 0;
}

function resolveMedicationVisitKey(
  row: Record<string, unknown>,
  fallbackIndex: number
) {
  const date = pickFirstByKeys(row, MEDICATION_DATE_KEYS) ?? "";
  const hospital = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) ?? "";
  const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS) ?? "";
  if (!date && !hospital && !visitType) return `unknown-${fallbackIndex}`;
  return `${date}|${hospital}|${visitType}`;
}

function resolveRowsFromContainer(value: unknown): Record<string, unknown>[] {
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

function resolveVisitLimit(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized <= 0) return null;
  return normalized;
}

function hasNamedEntry(rows: MedicationRow[]) {
  return rows.some((row) => !isDerivedMedicationLabel(row.medicationName));
}

export function extractMedicationRows(
  normalizedJson: unknown,
  options?: ExtractMedicationRowsOptions
): {
  rows: MedicationRow[];
  containerState: MedicationContainerState;
} {
  const normalized = asRecord(normalizedJson);
  if (!normalized || !("medication" in normalized)) {
    return { rows: [], containerState: "missing" };
  }

  const medicationRaw = normalized.medication;
  const medicationRecord = asRecord(medicationRaw);
  const medicationRows = resolveRowsFromContainer(medicationRaw);
  const medicalRows = resolveRowsFromContainer(normalized.medical);

  const containerState: MedicationContainerState =
    Array.isArray(medicationRaw) ||
    Array.isArray(medicationRecord?.list) ||
    Array.isArray(medicationRecord?.rows) ||
    Array.isArray(medicationRecord?.items) ||
    Array.isArray(medicationRecord?.history)
      ? "present"
      : medicationRecord
        ? "unrecognized"
        : "missing";

  const byVisit = new Map<
    string,
    { entries: MedicationRow[]; score: number; firstIndex: number }
  >();

  for (const [index, row] of medicationRows.entries()) {
    const hospitalName = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) || null;
    const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS);
    const pharmacyVisit = isLikelyPharmacyVisit({ visitType, hospitalName });
    const medicationNames = collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS);
    const medicationName =
      (medicationNames.length > 0 ? medicationNames.join(", ") : null) ??
      resolveMedicationFallbackName(row, pharmacyVisit);
    if (!medicationName) continue;
    const medicationEffects = collectMedicationEffectsByKeys(
      row,
      MEDICATION_EFFECT_KEYS
    );

    const entry: MedicationRow = {
      medicationName,
      hospitalName,
      date: pickFirstByKeys(row, MEDICATION_DATE_KEYS) || null,
      dosageDay: pickFirstByKeys(row, MEDICATION_DOSAGE_KEYS) || null,
      medicationEffects,
    };

    const visitKey = resolveMedicationVisitKey(row, index);
    const score = resolveMedicationDateScore(row);
    const group = byVisit.get(visitKey);
    if (!group) {
      byVisit.set(visitKey, {
        entries: [entry],
        score,
        firstIndex: index,
      });
      continue;
    }
    group.entries.push(entry);
    if (score > group.score) group.score = score;
  }

  const hasNamedFromMedication = [...byVisit.values()].some((group) =>
    hasNamedEntry(group.entries)
  );
  if ((!hasNamedFromMedication || byVisit.size === 0) && medicalRows.length > 0) {
    const offset = medicationRows.length;
    for (const [index, row] of medicalRows.entries()) {
      const mergedIndex = offset + index;
      const visitKey = resolveMedicationVisitKey(row, mergedIndex);
      if (byVisit.has(visitKey)) continue;

      const hospitalName = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) || null;
      const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS);
      const pharmacyVisit = isLikelyPharmacyVisit({ visitType, hospitalName });
      const medicationNames = collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS);
      const medicationName =
        (medicationNames.length > 0 ? medicationNames.join(", ") : null) ??
        resolveMedicationFallbackName(row, pharmacyVisit);
      if (!medicationName) continue;
      const medicationEffects = collectMedicationEffectsByKeys(
        row,
        MEDICATION_EFFECT_KEYS
      );

      const score = resolveMedicationDateScore(row);
      byVisit.set(visitKey, {
        entries: [
          {
            medicationName,
            hospitalName,
            date: pickFirstByKeys(row, MEDICATION_DATE_KEYS) || null,
            dosageDay: pickFirstByKeys(row, MEDICATION_DOSAGE_KEYS) || null,
            medicationEffects,
          },
        ],
        score,
        firstIndex: mergedIndex,
      });
    }
  }

  const visitLimit = resolveVisitLimit(options?.maxVisits);
  const rows = [...byVisit.values()]
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) return scoreDiff;
      return left.firstIndex - right.firstIndex;
    })
    .slice(0, visitLimit ?? undefined)
    .map((group) => {
      const representative =
        group.entries.find(
          (item) => !isDerivedMedicationLabel(item.medicationName)
        ) ?? group.entries[0];
      if (!representative) {
        return {
          medicationName: "-",
          hospitalName: null,
          date: null,
          dosageDay: null,
          medicationEffects: [],
        };
      }

      const names: string[] = [];
      const seenNames = new Set<string>();
      for (const item of group.entries) {
        const name = item.medicationName.trim();
        if (!name || seenNames.has(name)) continue;
        seenNames.add(name);
        names.push(name);
      }
      const effects: string[] = [];
      const seenEffects = new Set<string>();
      for (const item of group.entries) {
        for (const effect of item.medicationEffects) {
          const normalized = effect.trim();
          if (!normalized || seenEffects.has(normalized)) continue;
          seenEffects.add(normalized);
          effects.push(normalized);
        }
      }

      return {
        ...representative,
        medicationName:
          names.length > 0
            ? names.join(", ")
            : representative.medicationName,
        medicationEffects: effects,
      };
    });

  return {
    rows,
    containerState,
  };
}
