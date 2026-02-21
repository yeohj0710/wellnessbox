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

export type NormalizedNhisPayload = {
  medical: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  medication: {
    list: NhisRow[];
    summary: NhisListSummary;
  };
  healthAge: NhisHealthAgeSummary;
};

const LINE_PREFERRED_KEYS = [
  "subject",
  "examinee",
  "pharmNm",
  "medDate",
  "diagDate",
  "diagType",
  "medicineNm",
  "dosageDay",
  "medCnt",
  "presCnt",
] as const;

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

function buildCompactLine(row: NhisRow): string | null {
  const keys = Object.keys(row);
  if (keys.length === 0) return null;

  const preferred = LINE_PREFERRED_KEYS.filter((key) => key in row);
  const trailing = keys.filter((key) => !preferred.includes(key as (typeof LINE_PREFERRED_KEYS)[number]));
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

      const medList = asArray(detail.medList);
      if (medList.length === 0) {
        rows.push(baseRow);
        continue;
      }

      for (const medicineItem of medList) {
        const medicine = asRecord(medicineItem);
        const row: NhisRow = { ...baseRow };
        mergePrimitiveFields(row, medicine, new Set(["detailObj"]));
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
  const healthAge = asTextOrNumber(root.healthAge ?? root.health_age);
  const realAge = asTextOrNumber(root.age ?? root.realAge ?? root.real_age);
  const checkupDate = asPrimitive(root.date ?? root.checkupDate ?? root.checkup_date);
  const advice = asPrimitive(root.advice ?? root.summary ?? root.memo);
  const riskFactorTable =
    root.riskFactorTable ??
    root.risk_factor_table ??
    root.riskFactors ??
    root.riskFactorList ??
    [];

  return {
    healthAge,
    realAge,
    checkupDate: typeof checkupDate === "string" ? checkupDate : null,
    advice: typeof advice === "string" ? advice : null,
    riskFactorTable,
  };
}

export function normalizeNhisPayload(input: {
  medical: HyphenApiResponse;
  medication: HyphenApiResponse;
  healthAge: HyphenApiResponse;
}): NormalizedNhisPayload {
  return {
    medical: normalizeTreatmentPayload(input.medical),
    medication: normalizeTreatmentPayload(input.medication),
    healthAge: normalizeHealthAge(input.healthAge),
  };
}

