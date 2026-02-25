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
    const sublist = asArray(person.sublist);

    if (sublist.length === 0) {
      const row: NhisRow = {};
      if (subject !== undefined) row.subject = subject;
      if (examinee !== undefined) row.examinee = examinee;
      mergePrimitiveFields(row, person, new Set(["sublist"]));
      mergeNestedPrimitiveFields(row, person, "detailObj", "detail_");
      const medList = asArray(
        person.medList ?? person.medicineList ?? person.drugList
      );
      if (medList.length === 0) {
        rows.push(row);
        continue;
      }
      for (const medicineItem of medList) {
        const medicine = asRecord(medicineItem);
        const withMedicine: NhisRow = { ...row };
        mergePrimitiveFields(withMedicine, medicine, new Set(["detailObj"]));
        mergeNestedPrimitiveFields(withMedicine, medicine, "detailObj", "drug_");
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
      mergePrimitiveFields(baseRow, detail, new Set(["medList", "detailObj"]));
      mergeNestedPrimitiveFields(baseRow, detail, "detailObj", "detail_");

      const medList = asArray(
        detail.medList ?? detail.medicineList ?? detail.drugList
      );
      if (medList.length === 0) {
        rows.push(baseRow);
        continue;
      }

      for (const medicineItem of medList) {
        const medicine = asRecord(medicineItem);
        const row: NhisRow = { ...baseRow };
        mergePrimitiveFields(row, medicine, new Set(["detailObj"]));
        mergeNestedPrimitiveFields(row, medicine, "detailObj", "drug_");
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
