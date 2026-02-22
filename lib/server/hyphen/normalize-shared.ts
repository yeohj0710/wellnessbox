import type { HyphenApiResponse } from "@/lib/server/hyphen/client";
import type { JsonPrimitive, JsonRecord, NhisRow } from "@/lib/server/hyphen/normalize-types";

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

export function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asPrimitive(value: unknown): JsonPrimitive | undefined {
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

export function asTextOrNumber(value: unknown): string | number | null {
  const primitive = asPrimitive(value);
  if (primitive == null) return null;
  return typeof primitive === "boolean" ? String(primitive) : primitive;
}

export function toText(value: JsonPrimitive | undefined): string | null {
  if (value == null) return null;
  const rendered = String(value).trim();
  return rendered.length > 0 ? rendered : null;
}

export function getPayloadData(payload: unknown): JsonRecord {
  const root = asRecord(payload) ?? {};
  return asRecord(root.data) ?? root;
}

export function getListFromPayload(payload: HyphenApiResponse): unknown[] {
  const data = getPayloadData(payload);
  if (Array.isArray(data.list)) return data.list;
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function mergePrimitiveFields(
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

export function mergeNestedPrimitiveFields(
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

export function extractRecentLines(rows: NhisRow[], limit = 6): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    const line = buildCompactLine(row);
    if (line) out.push(line);
  }
  return out;
}

export function firstText(row: NhisRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return null;
}
