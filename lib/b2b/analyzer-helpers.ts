import "server-only";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

export function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSortableDateScore(value: unknown) {
  const text = toText(value);
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 6) {
    const score = Number(`${digits.slice(0, 6)}01`);
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 4) {
    const score = Number(`${digits.slice(0, 4)}0101`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

export function resolveMedicationList(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medicationRaw = normalized?.medication;
  if (Array.isArray(medicationRaw)) {
    return medicationRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }
  const medication = asRecord(medicationRaw);
  const list = asArray(
    medication?.list ?? medication?.rows ?? medication?.items ?? medication?.history
  );
  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function splitTextList(value: string | null | undefined, max = 5) {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of value.split(/[\n,;|]/g).map((item) => item.trim())) {
    if (!token) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= max) break;
  }
  return out;
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
