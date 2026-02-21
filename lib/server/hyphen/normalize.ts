import "server-only";

import type { HyphenApiResponse } from "@/lib/server/hyphen/client";

type JsonRecord = Record<string, unknown>;
type JsonPrimitive = string | number | boolean | null;
type NhisRow = Record<string, JsonPrimitive>;

export type NhisListSummary = {
  totalCount: number;
  recentLines: string[];
  peopleCount?: number;
  detailCount?: number;
};

export type NhisHealthAgeSummary = {
  healthAge: string | number | null;
  realAge: string | number | null;
  checkupDate: string | null;
  advice: string | null;
  riskFactorTable: unknown;
};

export type NhisCheckupSummary = {
  listCount: number;
  yearlyCount: number;
  overviewCount: number;
  yearCount: number;
  peopleCount: number;
  recentLines: string[];
};

export type NhisRecommendationSummary = {
  diagnosisTimeline: NhisRow[];
  medicationTimeline: NhisRow[];
  activeIngredients: string[];
  cautions: string[];
  checkupFindings: NhisRow[];
};

export type NormalizedNhisPayload = {
  medical: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  medication: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  checkup: {
    list: NhisRow[];
    yearly: NhisRow[];
    overview: NhisRow[];
    summary: NhisCheckupSummary;
  };
  healthAge: NhisHealthAgeSummary;
  recommendation: NhisRecommendationSummary;
};

const LINE_PREFERRED_KEYS = [
  "subject",
  "examinee",
  "name",
  "pharmNm",
  "hospitalNm",
  "medDate",
  "diagDate",
  "diagType",
  "medicineNm",
  "dosageDay",
  "medCnt",
  "presCnt",
  "year",
  "checkUpType",
  "result",
  "opinion",
] as const;

const INGREDIENT_KEYWORDS = ["cmpn_nm", "ingredient"];
const CAUTION_KEYWORDS = ["금기", "주의", "caution", "dur", "age_incp", "prgw_grde"];

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asPrimitive(value: unknown): JsonPrimitive | undefined {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean") return value;
  return undefined;
}

function asTextOrNumber(value: unknown): string | number | null {
  const primitive = asPrimitive(value);
  if (primitive == null) return null;
  return typeof primitive === "boolean" ? String(primitive) : primitive;
}

function toText(value: JsonPrimitive | undefined): string | null {
  if (value == null) return null;
  const rendered = String(value).trim();
  return rendered.length > 0 ? rendered : null;
}

function getPayloadData(payload: unknown): JsonRecord {
  const root = asRecord(payload) ?? {};
  return asRecord(root.data) ?? root;
}

function getListFromPayload(payload: HyphenApiResponse): unknown[] {
  const data = getPayloadData(payload);
  if (Array.isArray(data.list)) return data.list;
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function mergePrimitiveFields(
  target: NhisRow,
  source: JsonRecord | null,
  excludedKeys: Set<string>
) {
  if (!source) return;
  for (const [key, raw] of Object.entries(source)) {
    if (excludedKeys.has(key)) continue;
    const primitive = asPrimitive(raw);
    if (primitive === undefined) continue;
    target[key] = primitive;
  }
}

function mergeNestedPrimitiveFields(
  target: NhisRow,
  source: JsonRecord | null,
  nestedKey: string,
  prefix: string
) {
  const nested = asRecord(source?.[nestedKey]);
  if (!nested) return;
  for (const [key, value] of Object.entries(nested)) {
    const primitive = asPrimitive(value);
    if (primitive === undefined) continue;
    const composedKey = `${prefix}${key}`;
    if (composedKey in target) continue;
    target[composedKey] = primitive;
  }
}

function buildCompactLine(row: NhisRow): string | null {
  const keys = Object.keys(row);
  if (keys.length === 0) return null;

  const preferred = LINE_PREFERRED_KEYS.filter((key) => key in row);
  const trailing = keys.filter(
    (key) => !preferred.includes(key as (typeof LINE_PREFERRED_KEYS)[number])
  );
  const orderedKeys = [...preferred, ...trailing];

  const parts: string[] = [];
  for (const key of orderedKeys) {
    if (parts.length >= 6) break;
    const value = row[key];
    if (value == null) continue;
    const rendered = String(value).trim();
    if (!rendered) continue;
    parts.push(`${key}: ${rendered}`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

function extractRecentLines(rows: NhisRow[], limit = 6): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    const line = buildCompactLine(row);
    if (line) out.push(line);
  }
  return out;
}

function normalizeTreatmentPayload(payload: HyphenApiResponse) {
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
      rows.push(row);
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

      const medList = asArray(detail.medList);
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

function normalizeHealthAge(payload: HyphenApiResponse): NhisHealthAgeSummary {
  const root = getPayloadData(payload);
  const firstListRecord = asArray(root.list)
    .map((item) => asRecord(item))
    .find((item): item is JsonRecord => item !== null);
  const source = firstListRecord ?? root;

  const healthAge = asTextOrNumber(source.healthAge ?? source.health_age ?? source.hAge);
  const realAge = asTextOrNumber(source.age ?? source.realAge ?? source.real_age ?? source.rAge);
  const checkupDate = asPrimitive(
    source.date ?? source.checkupDate ?? source.checkup_date ?? source.examDate
  );
  const advice = asPrimitive(source.advice ?? source.summary ?? source.memo ?? source.comment);
  const riskFactorTable =
    source.riskFactorTable ??
    source.risk_factor_table ??
    source.riskFactors ??
    source.riskFactorList ??
    source.riskTable ??
    [];

  return {
    healthAge,
    realAge,
    checkupDate: typeof checkupDate === "string" ? checkupDate : null,
    advice: typeof advice === "string" ? advice : null,
    riskFactorTable,
  };
}

function normalizeCheckupListPayload(payloads: HyphenApiResponse[]) {
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

function normalizeCheckupYearlyPayload(payloads: HyphenApiResponse[]) {
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

function normalizeCheckupOverviewPayload(payload: HyphenApiResponse) {
  const rows: NhisRow[] = [];
  const list = getListFromPayload(payload);
  for (const item of list) {
    const row: NhisRow = {};
    mergePrimitiveFields(row, asRecord(item), new Set());
    rows.push(row);
  }
  return rows;
}

function firstText(row: NhisRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return null;
}

function buildDiagnosisTimeline(rows: NhisRow[]): NhisRow[] {
  const out: NhisRow[] = [];
  for (const row of rows) {
    const diagnosis = firstText(row, [
      "diagNm",
      "diseaseNm",
      "sickNm",
      "mainSickNm",
      "diagType",
      "medicineEffect",
      "detail_MOHW_CLSF",
    ]);
    const date = firstText(row, ["diagDate", "medDate"]);
    const place = firstText(row, ["hospitalNm", "hspNm", "pharmNm"]);
    if (!diagnosis && !date && !place) continue;

    const timelineRow: NhisRow = {};
    if (date) timelineRow.date = date;
    if (diagnosis) timelineRow.diagnosis = diagnosis;
    if (place) timelineRow.place = place;

    const subject = firstText(row, ["subject"]);
    const examinee = firstText(row, ["examinee"]);
    if (subject) timelineRow.subject = subject;
    if (examinee) timelineRow.examinee = examinee;

    out.push(timelineRow);
    if (out.length >= 40) break;
  }
  return out;
}

function buildMedicationTimeline(rows: NhisRow[]): NhisRow[] {
  const out: NhisRow[] = [];
  for (const row of rows) {
    const medicineName = firstText(row, ["medicineNm", "drug_MEDI_PRDC_NM", "MEDI_PRDC_NM"]);
    const date = firstText(row, ["diagDate", "medDate"]);
    const ingredient = firstText(row, ["drug_CMPN_NM", "CMPN_NM", "drug_CMPN_NM_2"]);
    const effect = firstText(row, ["medicineEffect", "drug_EFFT_EFT_CNT", "EFFT_EFT_CNT"]);
    const dosageDay = firstText(row, ["dosageDay"]);
    if (!medicineName && !ingredient && !effect) continue;

    const timelineRow: NhisRow = {};
    if (date) timelineRow.date = date;
    if (medicineName) timelineRow.medicine = medicineName;
    if (ingredient) timelineRow.ingredient = ingredient;
    if (effect) timelineRow.effect = effect;
    if (dosageDay) timelineRow.dosageDay = dosageDay;
    out.push(timelineRow);
    if (out.length >= 60) break;
  }
  return out;
}

function collectUniqueByKeywords(
  rows: NhisRow[],
  keywords: string[],
  max = 80
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase();
      if (!keywords.some((keyword) => normalizedKey.includes(keyword))) continue;
      const text = toText(value);
      if (!text) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length >= max) return out;
    }
  }

  return out;
}

function buildCheckupFindings(
  checkupListRows: NhisRow[],
  checkupYearlyRows: NhisRow[],
  checkupOverviewRows: NhisRow[]
) {
  const candidates = [...checkupOverviewRows, ...checkupListRows, ...checkupYearlyRows];
  const out: NhisRow[] = [];
  for (const row of candidates) {
    const finding: NhisRow = {};

    const year = firstText(row, ["year"]);
    const category = firstText(row, ["checkUpType", "title", "qtitle"]);
    const result = firstText(row, ["result", "chkResult", "total", "itemData"]);
    const opinion = firstText(row, ["opinion", "chkAgency", "itemName"]);

    if (year) finding.year = year;
    if (category) finding.category = category;
    if (result) finding.result = result;
    if (opinion) finding.note = opinion;

    if (Object.keys(finding).length === 0) continue;
    out.push(finding);
    if (out.length >= 80) break;
  }
  return out;
}

function normalizeRecommendationSummary(input: {
  medicalRows: NhisRow[];
  medicationRows: NhisRow[];
  checkupListRows: NhisRow[];
  checkupYearlyRows: NhisRow[];
  checkupOverviewRows: NhisRow[];
}): NhisRecommendationSummary {
  return {
    diagnosisTimeline: buildDiagnosisTimeline(input.medicalRows),
    medicationTimeline: buildMedicationTimeline(input.medicationRows),
    activeIngredients: collectUniqueByKeywords(input.medicationRows, INGREDIENT_KEYWORDS, 120),
    cautions: collectUniqueByKeywords(input.medicationRows, CAUTION_KEYWORDS, 80),
    checkupFindings: buildCheckupFindings(
      input.checkupListRows,
      input.checkupYearlyRows,
      input.checkupOverviewRows
    ),
  };
}

export function normalizeNhisPayload(input: {
  medical: HyphenApiResponse;
  medication: HyphenApiResponse;
  checkupList: HyphenApiResponse[];
  checkupYearly: HyphenApiResponse[];
  checkupOverview: HyphenApiResponse;
  healthAge: HyphenApiResponse;
}): NormalizedNhisPayload {
  const medical = normalizeTreatmentPayload(input.medical);
  const medication = normalizeTreatmentPayload(input.medication);

  const checkupListNormalized = normalizeCheckupListPayload(input.checkupList);
  const checkupYearlyRows = normalizeCheckupYearlyPayload(input.checkupYearly);
  const checkupOverviewRows = normalizeCheckupOverviewPayload(input.checkupOverview);

  const recommendation = normalizeRecommendationSummary({
    medicalRows: medical.list,
    medicationRows: medication.list,
    checkupListRows: checkupListNormalized.rows,
    checkupYearlyRows,
    checkupOverviewRows,
  });

  return {
    medical,
    medication,
    checkup: {
      list: checkupListNormalized.rows,
      yearly: checkupYearlyRows,
      overview: checkupOverviewRows,
      summary: {
        listCount: checkupListNormalized.rows.length,
        yearlyCount: checkupYearlyRows.length,
        overviewCount: checkupOverviewRows.length,
        peopleCount: checkupListNormalized.peopleCount,
        yearCount: checkupListNormalized.yearCount,
        recentLines: extractRecentLines(
          [...checkupOverviewRows, ...checkupListNormalized.rows, ...checkupYearlyRows],
          8
        ),
      },
    },
    healthAge: normalizeHealthAge(input.healthAge),
    recommendation,
  };
}

