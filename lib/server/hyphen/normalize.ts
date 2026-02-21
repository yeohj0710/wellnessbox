import "server-only";

import type { HyphenApiResponse } from "@/lib/server/hyphen/client";

type JsonRecord = Record<string, unknown>;

export type NhisCheckupSummary = {
  measuredAt: string | null;
  bloodPressure: string | null;
  fastingGlucose: string | null;
  totalCholesterol: string | null;
  hdl: string | null;
  ldl: string | null;
  triglyceride: string | null;
  weight: string | null;
  waist: string | null;
};

export type NhisLifestyleSummary = {
  list: unknown[];
  highlights: string[];
};

export type NhisHealthAgeSummary = {
  healthAge: string | number | null;
  riskFactorTable: unknown;
};

export type NormalizedNhisPayload = {
  checkup: {
    chkList: unknown[];
    lhList: unknown[];
    summary: NhisCheckupSummary;
  };
  lifestyle: NhisLifestyleSummary;
  healthAge: NhisHealthAgeSummary;
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function pickFromRecord(record: JsonRecord | null, keyParts: string[]): string | null {
  if (!record) return null;
  const entries = Object.entries(record);
  for (const [key, value] of entries) {
    const lowerKey = key.toLowerCase();
    if (keyParts.some((part) => lowerKey.includes(part))) {
      const found = asString(value);
      if (found) return found;
    }
  }
  return null;
}

function toCompactLine(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) {
    const primitive = asString(value);
    return primitive;
  }
  const pairs = Object.entries(record)
    .map(([key, raw]) => {
      const rendered = asString(raw);
      if (!rendered) return null;
      return `${key}: ${rendered}`;
    })
    .filter((line): line is string => !!line);
  if (pairs.length === 0) return null;
  return pairs.join(" | ");
}

function extractSummaryRows(source: unknown, limit = 5): string[] {
  const rows = asArray(source);
  const out: string[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    const line = toCompactLine(row);
    if (line) out.push(line);
  }
  return out;
}

function getPayloadData(payload: unknown): JsonRecord {
  const root = asRecord(payload) ?? {};
  return asRecord(root.data) ?? root;
}

function normalizeCheckup(
  checkupPayload: HyphenApiResponse
): { chkList: unknown[]; lhList: unknown[]; summary: NhisCheckupSummary } {
  const data = getPayloadData(checkupPayload);
  const chkList = asArray(data.chkList);
  const lhList = asArray(data.lhList);
  const latest = asRecord(chkList[0]) ?? data;

  const sbp = pickFromRecord(latest, ["sbp", "systolic", "maxbp", "highbp"]);
  const dbp = pickFromRecord(latest, ["dbp", "diastolic", "minbp", "lowbp"]);
  const bloodPressure = sbp && dbp ? `${sbp}/${dbp}` : sbp ?? dbp ?? null;

  return {
    chkList,
    lhList,
    summary: {
      measuredAt:
        pickFromRecord(latest, ["checkup", "examdate", "exam_dt", "date"]) ??
        null,
      bloodPressure,
      fastingGlucose: pickFromRecord(latest, ["fbs", "glucose", "bloodsugar"]),
      totalCholesterol: pickFromRecord(latest, ["totalchol", "cholesterol"]),
      hdl: pickFromRecord(latest, ["hdl"]),
      ldl: pickFromRecord(latest, ["ldl"]),
      triglyceride: pickFromRecord(latest, ["tg", "triglyceride"]),
      weight: pickFromRecord(latest, ["weight", "wt"]),
      waist: pickFromRecord(latest, ["waist", "waistline"]),
    },
  };
}

function normalizeLifestyle(
  lifestylePayload: HyphenApiResponse,
  fallbackLhList: unknown[]
): NhisLifestyleSummary {
  const data = getPayloadData(lifestylePayload);
  const lhList = asArray(data.lhList);
  const list = lhList.length > 0 ? lhList : fallbackLhList;
  return {
    list,
    highlights: extractSummaryRows(list),
  };
}

function normalizeHealthAge(healthAgePayload: HyphenApiResponse): NhisHealthAgeSummary {
  const data = getPayloadData(healthAgePayload);
  const root = asRecord(data) ?? {};
  const healthAge =
    root.healthAge ??
    root.health_age ??
    root.age ??
    null;
  const riskFactorTable =
    root.riskFactorTable ??
    root.risk_factor_table ??
    root.riskFactors ??
    root.riskFactorList ??
    [];

  if (typeof healthAge === "string" || typeof healthAge === "number") {
    return { healthAge, riskFactorTable };
  }
  return { healthAge: null, riskFactorTable };
}

export function normalizeNhisPayload(input: {
  checkup: HyphenApiResponse;
  lifestyle: HyphenApiResponse;
  healthAge: HyphenApiResponse;
}): NormalizedNhisPayload {
  const checkup = normalizeCheckup(input.checkup);
  const lifestyle = normalizeLifestyle(input.lifestyle, checkup.lhList);
  const healthAge = normalizeHealthAge(input.healthAge);
  return {
    checkup,
    lifestyle,
    healthAge,
  };
}
