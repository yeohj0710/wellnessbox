import type { NhisDataRow, NhisPrimitive } from "./types";

export type MedicationDigest = {
  totalRows: number;
  uniqueMedicineCount: number;
  topMedicines: Array<{ label: string; count: number }>;
  topConditions: Array<{ label: string; count: number }>;
  recentMedications: Array<{
    date: string;
    medicine: string;
    effect: string | null;
  }>;
};

function primitiveToText(value: NhisPrimitive | undefined) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function pickFirstText(row: NhisDataRow, keys: string[]) {
  for (const key of keys) {
    const text = primitiveToText(row[key]);
    if (text) return text;
  }
  return null;
}

function parseSortableDateScore(value: string | null) {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function toTopCountItems(source: Map<string, number>, maxItems: number) {
  return [...source.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko")
    )
    .slice(0, maxItems)
    .map(([label, count]) => ({ label, count }));
}

function incrementCount(source: Map<string, number>, value: string | null) {
  if (!value) return;
  source.set(value, (source.get(value) ?? 0) + 1);
}

export function summarizeMedicationRows(rows: NhisDataRow[]): MedicationDigest {
  const medicineCount = new Map<string, number>();
  const conditionCount = new Map<string, number>();
  const recentItems = new Map<
    string,
    { date: string; medicine: string; effect: string | null }
  >();

  for (const row of rows) {
    const medicine = pickFirstText(row, [
      "medicineNm",
      "drug_MEDI_PRDC_NM",
      "MEDI_PRDC_NM",
    ]);
    const condition = pickFirstText(row, [
      "diagType",
      "drug_MOHW_CLSF",
      "detail_MOHW_CLSF",
      "medicineEffect",
    ]);
    const date = pickFirstText(row, ["diagDate", "medDate"]);
    const effect = pickFirstText(row, [
      "medicineEffect",
      "drug_EFFT_EFT_CNT",
      "EFFT_EFT_CNT",
    ]);

    incrementCount(medicineCount, medicine);
    incrementCount(conditionCount, condition);

    if (!medicine || !date) continue;
    const signature = `${date}|${medicine}`;
    if (!recentItems.has(signature)) {
      recentItems.set(signature, {
        date,
        medicine,
        effect: effect ?? null,
      });
    }
  }

  const recentMedications = [...recentItems.values()]
    .sort(
      (left, right) =>
        parseSortableDateScore(right.date) - parseSortableDateScore(left.date) ||
        left.medicine.localeCompare(right.medicine, "ko")
    )
    .slice(0, 3);

  return {
    totalRows: rows.length,
    uniqueMedicineCount: medicineCount.size,
    topMedicines: toTopCountItems(medicineCount, 5),
    topConditions: toTopCountItems(conditionCount, 5),
    recentMedications,
  };
}
