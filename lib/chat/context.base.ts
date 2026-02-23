import { CODE_TO_LABEL } from "@/lib/categories";
import type { DateLike } from "./context.types";

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function uniq(values: string[], maxItems: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function clip(text: string, max = 80) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function parseDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: DateLike) {
  const date = parseDate(value);
  if (!date) return "-";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeCategoryLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return CODE_TO_LABEL[trimmed as keyof typeof CODE_TO_LABEL] || trimmed;
}

export function stripPercentSuffix(text: string) {
  return text.replace(/\s+[\d.]+%$/, "").trim();
}

export function toPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(toPlainText).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.value === "string") return record.value;
    if (Array.isArray(record.parts)) return record.parts.map(toPlainText).join(" ");
    if (Array.isArray(record.content))
      return record.content.map(toPlainText).join(" ");
    if (Array.isArray(record.children))
      return record.children.map(toPlainText).join(" ");
  }
  return "";
}
