import type { NhisDataRow, NhisPrimitive } from "./types";

export type LatestCheckupMeta = {
  year: string | null;
  checkupDate: string | null;
  agency: string | null;
  overallResult: string | null;
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

function parseYearValue(value: string | null) {
  if (!value) return 0;
  const match = value.match(/(20\d{2}|19\d{2})/);
  if (!match) return 0;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : 0;
}

function parseMonthDayValue(value: string | null) {
  if (!value) return { month: 0, day: 0 };
  const match = value.match(/(\d{1,2})[./-](\d{1,2})/);
  if (!match) return { month: 0, day: 0 };
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return { month: 0, day: 0 };
  }
  return { month, day };
}

function compareCheckupKey(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number }
) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

function resolveCheckupSortKey(row: NhisDataRow) {
  const yearText = pickFirstText(row, ["year", "checkupDate", "date"]);
  const dateText = pickFirstText(row, ["checkupDate", "date"]);
  const year = parseYearValue(yearText);
  const { month, day } = parseMonthDayValue(dateText);
  return { year, month, day };
}

export function selectLatestCheckupRows(rows: NhisDataRow[]) {
  if (rows.length === 0) return [];

  let bestKey = resolveCheckupSortKey(rows[0]);
  for (let index = 1; index < rows.length; index += 1) {
    const nextKey = resolveCheckupSortKey(rows[index]);
    if (compareCheckupKey(nextKey, bestKey) > 0) {
      bestKey = nextKey;
    }
  }

  return rows.filter((row) => {
    const key = resolveCheckupSortKey(row);
    if (key.year !== bestKey.year) return false;
    if (bestKey.month === 0 && bestKey.day === 0) return true;
    return key.month === bestKey.month && key.day === bestKey.day;
  });
}

export function extractLatestCheckupMeta(rows: NhisDataRow[]): LatestCheckupMeta {
  const year =
    rows
      .map((row) => pickFirstText(row, ["year"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const checkupDate =
    rows
      .map((row) => pickFirstText(row, ["checkupDate", "date"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const agency =
    rows
      .map((row) => pickFirstText(row, ["chkAgency", "agency", "hospitalNm"]))
      .find((value): value is string => Boolean(value)) ?? null;
  const overallResult =
    rows
      .map((row) => pickFirstText(row, ["overallResult", "result"]))
      .find((value): value is string => Boolean(value)) ?? null;

  return {
    year,
    checkupDate,
    agency,
    overallResult,
  };
}
