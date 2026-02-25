export type ColumnPostStatus = "draft" | "published";

const SLUG_INVALID_PATTERN = /[^\p{L}\p{N}_-]+/gu;

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

export function slugifyColumnSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(SLUG_INVALID_PATTERN, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeColumnStatus(value: unknown): ColumnPostStatus {
  return value === "published" ? "published" : "draft";
}

export function normalizeColumnTags(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(/[,\n/|]/g)
    : [];
  const tags = raw.map((item) => toText(item)).filter(Boolean);
  return Array.from(new Set(tags));
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeText(text: string, maxLength = 160) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function summarizeMarkdown(markdown: string, maxLength = 160) {
  return summarizeText(markdownToPlainText(markdown), maxLength);
}

export function estimateReadingMinutesFromMarkdown(markdown: string) {
  const chars = markdownToPlainText(markdown).replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 450));
}
