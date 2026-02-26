type Primitive = string | number | boolean | null;

export type CheckupSample = {
  metric: string;
  value: string;
  reference: string | null;
  date: string | null;
};

export type MedicationSample = {
  date: string | null;
  medicine: string;
  purpose: string | null;
};

export type NhisAiSnapshot = {
  checkupCount: number;
  medicationCount: number;
  latestCheckupDate: string | null;
  checkupSamples: CheckupSample[];
  medicationSamples: MedicationSample[];
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function toTrimmedText(
  value: Primitive | unknown,
  max = 120
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return null;
  }
  const compact = String(value).replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.slice(0, max);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

function pickFirstText(
  record: Record<string, unknown>,
  keys: string[],
  max = 100
) {
  for (const key of keys) {
    const text = toTrimmedText(record[key], max);
    if (text) return text;
  }
  return null;
}

function toDateScore(value: string | null) {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const parsed = Number(digits.slice(0, 8));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickCheckupSamples(normalized: Record<string, unknown>) {
  const checkup = asRecord(normalized.checkup);
  const checkupSummary = asRecord(checkup?.summary);
  const overviewRows = asArray(checkup?.overview);

  const dedup = new Set<string>();
  const samples: CheckupSample[] = [];
  let latestCheckupDate: string | null = null;

  for (const rowValue of overviewRows) {
    const row = asRecord(rowValue);
    if (!row) continue;

    const metric = pickFirstText(row, ["metric", "itemName", "inspectItem", "type"]);
    const value = pickFirstText(row, ["value", "itemData", "result"]);
    if (!metric || !value) continue;

    const date = pickFirstText(row, ["checkupDate", "date", "year"], 32);
    if (date && toDateScore(date) > toDateScore(latestCheckupDate)) {
      latestCheckupDate = date;
    }

    const reference = [
      pickFirstText(row, ["normalA"], 40),
      pickFirstText(row, ["normalB"], 40),
      pickFirstText(row, ["suspicionDis"], 40),
    ]
      .filter((item): item is string => Boolean(item))
      .join(" / ");

    const signature = `${metric}|${value}|${date ?? ""}`;
    if (dedup.has(signature)) continue;
    dedup.add(signature);

    samples.push({
      metric,
      value,
      reference: reference || null,
      date,
    });
  }

  samples.sort((left, right) => toDateScore(right.date) - toDateScore(left.date));

  const checkupCount =
    toCount(checkupSummary?.overviewCount) ??
    toCount(checkupSummary?.listCount) ??
    overviewRows.length;

  return {
    checkupCount,
    latestCheckupDate,
    checkupSamples: samples.slice(0, 12),
  };
}

function pickMedicationSamples(normalized: Record<string, unknown>) {
  const medication = asRecord(normalized.medication);
  const medicationSummary = asRecord(medication?.summary);
  const rows = asArray(medication?.list);

  const dedup = new Set<string>();
  const samples: MedicationSample[] = [];

  for (const rowValue of rows) {
    const row = asRecord(rowValue);
    if (!row) continue;

    const medicine = pickFirstText(
      row,
      [
        "medicineNm",
        "medicine",
        "drugName",
        "drugNm",
        "prodName",
        "medNm",
        "medicineName",
        "drug_MEDI_PRDC_NM",
        "MEDI_PRDC_NM",
        "detail_CMPN_NM",
        "CMPN_NM",
      ],
      80
    );
    if (!medicine) continue;

    const date = pickFirstText(
      row,
      [
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
        "medicationDate",
      ],
      32
    );
    const purpose = pickFirstText(
      row,
      ["effect", "drug_effect", "purpose", "diagName", "diseaseName"],
      70
    );

    const signature = `${medicine}|${date ?? ""}|${purpose ?? ""}`;
    if (dedup.has(signature)) continue;
    dedup.add(signature);

    samples.push({
      medicine,
      date,
      purpose,
    });
  }

  samples.sort((left, right) => toDateScore(right.date) - toDateScore(left.date));

  const medicationCount = toCount(medicationSummary?.totalCount) ?? rows.length;

  return {
    medicationCount,
    medicationSamples: samples.slice(0, 4),
  };
}

export function buildNhisAiSnapshot(
  normalized: Record<string, unknown>
): NhisAiSnapshot {
  const checkup = pickCheckupSamples(normalized);
  const medication = pickMedicationSamples(normalized);
  return {
    checkupCount: checkup.checkupCount,
    medicationCount: medication.medicationCount,
    latestCheckupDate: checkup.latestCheckupDate,
    checkupSamples: checkup.checkupSamples,
    medicationSamples: medication.medicationSamples,
  };
}
