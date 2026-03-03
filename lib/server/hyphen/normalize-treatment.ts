import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import type { NhisRow } from "@/lib/server/hyphen/normalize-types";
import {
  asArray,
  asPrimitive,
  asRecord,
  extractRecentLines,
  getListFromPayload,
  mergeNestedPrimitiveFields,
  mergePrimitiveFields,
} from "@/lib/server/hyphen/normalize-shared";

const SUBLIST_KEYS = ["sublist", "subList", "sub_list", "SUBLIST"] as const;
const MED_LIST_KEYS = [
  "medList",
  "medlist",
  "medicineList",
  "medicine_list",
  "drugList",
  "druglist",
  "medications",
] as const;
const DETAIL_OBJECT_KEYS = [
  "detailObj",
  "detailOBJ",
  "detail",
  "detail_obj",
  "detailObject",
] as const;

const DEFAULT_TREATMENT_MAX_ROWS = 1500;

function resolveTreatmentMaxRows() {
  const raw = process.env.HYPHEN_NHIS_NORMALIZE_TREATMENT_MAX_ROWS;
  if (!raw) return DEFAULT_TREATMENT_MAX_ROWS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_TREATMENT_MAX_ROWS;
  return Math.max(100, Math.floor(parsed));
}

function pickFirstArray(
  source: Record<string, unknown> | null,
  keys: readonly string[]
) {
  if (!source) return [];
  for (const key of keys) {
    const list = asArray(source[key]);
    if (list.length > 0) return list;
  }
  return [];
}

function mergeAllDetailObjects(
  target: NhisRow,
  source: Record<string, unknown> | null,
  prefix: string
) {
  for (const key of DETAIL_OBJECT_KEYS) {
    mergeNestedPrimitiveFields(target, source, key, prefix);
  }
}

export function normalizeTreatmentPayload(payload: HyphenApiResponse) {
  const list = getListFromPayload(payload);
  const rows: NhisRow[] = [];
  let peopleCount = 0;
  let detailCount = 0;
  const maxRows = resolveTreatmentMaxRows();

  const pushRow = (row: NhisRow) => {
    if (rows.length >= maxRows) return false;
    rows.push(row);
    return true;
  };

  outer: for (const personItem of list) {
    if (rows.length >= maxRows) break;
    const person = asRecord(personItem);
    if (!person) continue;
    peopleCount += 1;

    const subject = asPrimitive(person.subject);
    const examinee = asPrimitive(person.examinee);
    const sublist = pickFirstArray(person, SUBLIST_KEYS);

    if (sublist.length === 0) {
      const row: NhisRow = {};
      if (subject !== undefined) row.subject = subject;
      if (examinee !== undefined) row.examinee = examinee;
      mergePrimitiveFields(
        row,
        person,
        new Set([...SUBLIST_KEYS, ...MED_LIST_KEYS, ...DETAIL_OBJECT_KEYS])
      );
      mergeAllDetailObjects(row, person, "detail_");
      const medList = pickFirstArray(person, MED_LIST_KEYS);
      if (medList.length === 0) {
        if (!pushRow(row)) break outer;
        continue;
      }
      for (const medicineItem of medList) {
        if (rows.length >= maxRows) break outer;
        const medicine = asRecord(medicineItem);
        const withMedicine: NhisRow = { ...row };
        mergePrimitiveFields(withMedicine, medicine, new Set(DETAIL_OBJECT_KEYS));
        mergeAllDetailObjects(withMedicine, medicine, "drug_");
        if (!pushRow(withMedicine)) break outer;
      }
      continue;
    }

    for (const detailItem of sublist) {
      if (rows.length >= maxRows) break outer;
      const detail = asRecord(detailItem);
      if (!detail) continue;
      detailCount += 1;

      const baseRow: NhisRow = {};
      if (subject !== undefined) baseRow.subject = subject;
      if (examinee !== undefined) baseRow.examinee = examinee;
      mergePrimitiveFields(
        baseRow,
        detail,
        new Set([...MED_LIST_KEYS, ...DETAIL_OBJECT_KEYS])
      );
      mergeAllDetailObjects(baseRow, detail, "detail_");

      const medList = pickFirstArray(detail, MED_LIST_KEYS);
      if (medList.length === 0) {
        if (!pushRow(baseRow)) break outer;
        continue;
      }

      for (const medicineItem of medList) {
        if (rows.length >= maxRows) break outer;
        const medicine = asRecord(medicineItem);
        const row: NhisRow = { ...baseRow };
        mergePrimitiveFields(row, medicine, new Set(DETAIL_OBJECT_KEYS));
        mergeAllDetailObjects(row, medicine, "drug_");
        if (!pushRow(row)) break outer;
      }
    }
  }

  return {
    list: rows,
    summary: {
      totalCount: rows.length,
      recentLines: extractRecentLines(rows),
      peopleCount,
      detailCount,
    },
  };
}
