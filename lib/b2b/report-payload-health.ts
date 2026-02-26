import {
  asArray,
  asRecord,
  toText,
} from "@/lib/b2b/report-payload-shared";

type HealthMetric = { metric: string; value: string; unit: string | null };

type MedicationRow = {
  medicationName: string;
  hospitalName: string | null;
  date: string | null;
  dosageDay: string | null;
};

export type MedicationContainerState = "present" | "missing" | "unrecognized";

function normalizeCompact(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function normalizeUnit(unit: string | null | undefined) {
  if (!unit) return null;
  const normalized = normalizeCompact(unit).toLowerCase();
  if (!normalized) return null;
  const table: Record<string, string> = {
    mmhg: "mmHg",
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "kg/m2": "kg/m2",
    "kg/m짼": "kg/m2",
    cm: "cm",
    kg: "kg",
    bpm: "bpm",
    "%": "%",
  };
  return table[normalized] ?? unit.trim();
}

export function mergeValueWithUnit(value: string, unit: string | null) {
  if (!unit) return value;
  const compactValue = normalizeCompact(value).toLowerCase();
  const compactUnit = normalizeCompact(unit).toLowerCase();
  if (compactValue.includes(compactUnit)) return value;
  return `${value} ${unit}`.trim();
}

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

export function extractHealthMetrics(normalizedJson: unknown): HealthMetric[] {
  const normalized = asRecord(normalizedJson);
  const checkup = asRecord(normalized?.checkup);
  const overview = asArray(checkup?.overview);
  const metrics: HealthMetric[] = [];
  const seen = new Set<string>();

  for (const item of overview) {
    const row = asRecord(item);
    if (!row) continue;
    const metric = toText(row.itemName ?? row.metric ?? row.inspectItem ?? row.type);
    const valueRaw = toText(row.value ?? row.itemData ?? row.result);
    const unit = normalizeUnit(toText(row.unit) || null);
    if (!metric || !valueRaw) continue;
    const value = mergeValueWithUnit(valueRaw, unit);
    const uniqueKey = `${metric}|${value}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    metrics.push({ metric, value, unit });
    if (metrics.length >= 16) break;
  }

  return metrics;
}

export function extractMedicationRows(normalizedJson: unknown): {
  rows: MedicationRow[];
  containerState: MedicationContainerState;
} {
  const normalized = asRecord(normalizedJson);
  if (!normalized || !("medication" in normalized)) {
    return { rows: [], containerState: "missing" };
  }
  const medicationRaw = normalized.medication;
  const medicationRecord = asRecord(medicationRaw);
  const list = Array.isArray(medicationRaw)
    ? medicationRaw
    : asArray(
        medicationRecord?.list ??
          medicationRecord?.rows ??
          medicationRecord?.items ??
          medicationRecord?.history
      );
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
  const rows: MedicationRow[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const medicationName = toText(
      row.medicineNm ??
        row.medicine ??
        row.drugName ??
        row.drugNm ??
        row.medNm ??
        row.medicineName ??
        row.prodName ??
        row.drug_MEDI_PRDC_NM ??
        row.MEDI_PRDC_NM ??
        row.detail_CMPN_NM ??
        row.CMPN_NM
    );
    if (!medicationName) continue;

    const hospitalName =
      toText(
        row.hospitalNm ??
          row.hospitalName ??
          row.hospital ??
          row.clinicName ??
          row.hspNm ??
          row.detail_HSP_NM ??
          row.drug_HSP_NM ??
          row.clinicNm
      ) || null;

    const date =
      toText(
        row.diagDate ??
          row.medDate ??
          row.date ??
          row.rxDate ??
          row.prescribeDate ??
          row.prscDate ??
          row.takeDate ??
          row.TRTM_YMD ??
          row.detail_PRSC_YMD ??
          row.detail_TRTM_YMD ??
          row.drug_PRSC_YMD ??
          row.drug_TRTM_YMD ??
          row.PRSC_YMD ??
          row.medicationDate
      ) || null;

    const dosageDay =
      toText(
        row.dosageDay ??
          row.period ??
          row.takeDay ??
          row.dayCount ??
          row.detail_DOSAGE_DAY ??
          row.drug_DOSAGE_DAY
      ) || null;

    const uniqueKey = `${medicationName}|${date ?? ""}|${hospitalName ?? ""}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    rows.push({
      medicationName,
      hospitalName,
      date,
      dosageDay,
    });
  }

  return {
    rows: rows
      .sort((a, b) => parseSortableDateScore(b.date) - parseSortableDateScore(a.date))
      .slice(0, 3),
    containerState,
  };
}

export function extractFailedTargets(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const failedRaw = asArray(meta?.failed ?? root?.failed);
  const targets = failedRaw
    .map((item) => asRecord(item))
    .map((item) => toText(item?.target))
    .filter((item): item is string => Boolean(item));
  return [...new Set(targets)];
}

export function parseFetchFlags(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const partialValue = meta?.partial ?? root?.partial;
  const partial = partialValue === true;
  return {
    partial,
    failedTargets: extractFailedTargets(rawJson),
  };
}
