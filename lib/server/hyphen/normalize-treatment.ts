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

  for (const personItem of list) {
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
        rows.push(row);
        continue;
      }
      for (const medicineItem of medList) {
        const medicine = asRecord(medicineItem);
        const withMedicine: NhisRow = { ...row };
        mergePrimitiveFields(withMedicine, medicine, new Set(DETAIL_OBJECT_KEYS));
        mergeAllDetailObjects(withMedicine, medicine, "drug_");
        rows.push(withMedicine);
      }
      continue;
    }

    for (const detailItem of sublist) {
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
        rows.push(baseRow);
        continue;
      }

      for (const medicineItem of medList) {
        const medicine = asRecord(medicineItem);
        const row: NhisRow = { ...baseRow };
        mergePrimitiveFields(row, medicine, new Set(DETAIL_OBJECT_KEYS));
        mergeAllDetailObjects(row, medicine, "drug_");
        rows.push(row);
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
