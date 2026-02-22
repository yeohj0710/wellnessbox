import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import type { NhisRow } from "@/lib/server/hyphen/normalize-types";
import {
  asArray,
  asPrimitive,
  asRecord,
  getListFromPayload,
  getPayloadData,
  mergePrimitiveFields,
  toText,
} from "@/lib/server/hyphen/normalize-shared";

export function normalizeCheckupListPayload(payloads: HyphenApiResponse[]) {
  const rows: NhisRow[] = [];
  const people = new Set<string>();
  const years = new Set<string>();

  for (const payload of payloads) {
    const data = getPayloadData(payload);
    const guessedYear = toText(asPrimitive(data.yyyy ?? data.year ?? data.businessYear));
    if (guessedYear) years.add(guessedYear);

    const list = asArray(data.list);
    for (const personItem of list) {
      const person = asRecord(personItem);
      if (!person) continue;

      const name = toText(asPrimitive(person.name));
      const bizNo = toText(asPrimitive(person.bizNo));
      if (name || bizNo) people.add(`${name ?? ""}|${bizNo ?? ""}`);

      const inqryResList = asArray(person.inqryResList);
      if (inqryResList.length === 0) {
        const row: NhisRow = {};
        if (guessedYear) row.year = guessedYear;
        mergePrimitiveFields(row, person, new Set(["inqryResList"]));
        rows.push(row);
        continue;
      }

      for (const resultItem of inqryResList) {
        const result = asRecord(resultItem);
        const row: NhisRow = {};
        if (guessedYear) row.year = guessedYear;
        mergePrimitiveFields(row, person, new Set(["inqryResList"]));
        mergePrimitiveFields(row, result, new Set());
        rows.push(row);
      }
    }
  }

  return { rows, peopleCount: people.size, yearCount: years.size };
}

export function normalizeCheckupYearlyPayload(payloads: HyphenApiResponse[]) {
  const rows: NhisRow[] = [];

  for (const payload of payloads) {
    const data = getPayloadData(payload);
    const detailKey = asPrimitive(data.detailKey);
    const detailKey2 = asPrimitive(data.detailKey2);

    const infoList = asArray(data.list);
    for (const infoItem of infoList) {
      const info = asRecord(infoItem);
      if (!info) continue;

      const title = asPrimitive(info.title);
      const checkList = asArray(info.checkList);
      if (checkList.length === 0) {
        const row: NhisRow = {};
        if (title !== undefined) row.title = title;
        if (detailKey !== undefined) row.detailKey = detailKey;
        if (detailKey2 !== undefined) row.detailKey2 = detailKey2;
        rows.push(row);
        continue;
      }

      for (const checkItem of checkList) {
        const check = asRecord(checkItem);
        if (!check) continue;
        const qtitle = asPrimitive(check.qtitle);
        const itemList = asArray(check.itemList);

        if (itemList.length === 0) {
          const row: NhisRow = {};
          if (title !== undefined) row.title = title;
          if (qtitle !== undefined) row.qtitle = qtitle;
          if (detailKey !== undefined) row.detailKey = detailKey;
          if (detailKey2 !== undefined) row.detailKey2 = detailKey2;
          rows.push(row);
          continue;
        }

        for (const item of itemList) {
          const itemRecord = asRecord(item);
          const row: NhisRow = {};
          if (title !== undefined) row.title = title;
          if (qtitle !== undefined) row.qtitle = qtitle;
          if (detailKey !== undefined) row.detailKey = detailKey;
          if (detailKey2 !== undefined) row.detailKey2 = detailKey2;
          mergePrimitiveFields(row, itemRecord, new Set());
          rows.push(row);
        }
      }
    }
  }

  return rows;
}

export function normalizeCheckupOverviewPayload(payload: HyphenApiResponse) {
  const rows: NhisRow[] = [];
  const list = getListFromPayload(payload);
  for (const item of list) {
    const summary = asRecord(item);
    if (!summary) continue;

    const year = asPrimitive(summary.year);
    const overallResult = asPrimitive(summary.result);
    const checkupAgency = asPrimitive(summary.chkAgency);
    const opinion = asPrimitive(summary.opinion);
    const detailItems = asArray(summary.chkResult);

    let checkupDate: string | number | boolean | null | undefined;
    for (const detailItem of detailItems) {
      const detail = asRecord(detailItem);
      if (!detail) continue;
      const type = toText(asPrimitive(detail.type));
      const inspectItem = toText(asPrimitive(detail.inspectItem));
      const isDateRow =
        (type && type.includes("검진일")) || (inspectItem && inspectItem.includes("검진일"));
      if (!isDateRow) continue;
      checkupDate = asPrimitive(detail.result);
      if (checkupDate !== undefined) break;
    }

    if (detailItems.length === 0) {
      const row: NhisRow = {};
      mergePrimitiveFields(row, summary, new Set(["chkResult"]));
      rows.push(row);
      continue;
    }

    for (const detailItem of detailItems) {
      const detail = asRecord(detailItem);
      if (!detail) continue;

      const itemName =
        asPrimitive(detail.inspectItem) ??
        asPrimitive(detail.type) ??
        asPrimitive(detail.targetDis);
      const itemData = asPrimitive(detail.result);
      const unit = toText(asPrimitive(detail.unit));

      const row: NhisRow = {};
      if (year !== undefined) row.year = year;
      if (checkupDate !== undefined) row.checkupDate = checkupDate;
      if (checkupAgency !== undefined) row.chkAgency = checkupAgency;
      if (overallResult !== undefined) row.overallResult = overallResult;
      if (opinion !== undefined) row.opinion = opinion;

      if (itemName !== undefined) {
        row.metric = itemName;
        row.itemName = itemName;
      }
      if (itemData !== undefined) {
        row.itemData = itemData;
        row.value = typeof itemData === "string" && unit ? `${itemData} ${unit}` : itemData;
      }

      mergePrimitiveFields(row, detail, new Set());
      rows.push(row);
    }
  }
  return rows;
}
