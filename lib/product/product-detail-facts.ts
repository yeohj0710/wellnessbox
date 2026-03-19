export type ProductDetailFactRow = {
  label: string;
  value: string;
};

export type ProductDetailFactGroup = {
  title: string;
  rows: ProductDetailFactRow[];
};

export type ProductDetailFacts = {
  highlights?: ProductDetailFactRow[];
  groups: ProductDetailFactGroup[];
  sourceUrls?: string[];
};

type ProductDetailFactsCandidate = {
  id: number;
  name: string;
  facts: ProductDetailFacts;
};

function toTrimmedText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRow(row: unknown): ProductDetailFactRow | null {
  if (!row || typeof row !== "object") return null;

  const label = toTrimmedText((row as { label?: unknown }).label);
  const value = toTrimmedText((row as { value?: unknown }).value);

  if (!label || !value) return null;
  return { label, value };
}

function normalizeGroup(group: unknown): ProductDetailFactGroup | null {
  if (!group || typeof group !== "object") return null;

  const title = toTrimmedText((group as { title?: unknown }).title);
  const rowsValue = (group as { rows?: unknown }).rows;
  const rows = Array.isArray(rowsValue)
    ? rowsValue.map(normalizeRow).filter((row): row is ProductDetailFactRow => row != null)
    : [];

  if (!title || rows.length === 0) return null;
  return { title, rows };
}

function normalizeSourceUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(toTrimmedText)
    .filter((item): item is string => item != null);
}

export function normalizeProductDetailFacts(raw: unknown): ProductDetailFacts | null {
  if (!raw || typeof raw !== "object") return null;

  const highlightsValue = (raw as { highlights?: unknown }).highlights;
  const groupsValue = (raw as { groups?: unknown }).groups;
  const sourceUrlsValue = (raw as { sourceUrls?: unknown }).sourceUrls;

  const highlights = Array.isArray(highlightsValue)
    ? highlightsValue.map(normalizeRow).filter((row): row is ProductDetailFactRow => row != null)
    : [];
  const groups = Array.isArray(groupsValue)
    ? groupsValue.map(normalizeGroup).filter((group): group is ProductDetailFactGroup => group != null)
    : [];
  const sourceUrls = normalizeSourceUrls(sourceUrlsValue);

  if (groups.length === 0 && highlights.length === 0) return null;

  return {
    highlights: highlights.length > 0 ? highlights : undefined,
    groups,
    sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
  };
}

function normalizeProductName(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function findCuratedProductDetailFacts(
  entries: ProductDetailFactsCandidate[],
  product: { id?: number | null; name?: string | null }
) {
  const byId =
    typeof product.id === "number"
      ? entries.find((entry) => entry.id === product.id) || null
      : null;
  if (byId) return byId.facts;

  const normalizedName = normalizeProductName(product.name);
  if (!normalizedName) return null;

  return (
    entries.find((entry) => normalizeProductName(entry.name) === normalizedName)?.facts ||
    null
  );
}

export function getSourceHostLabel(sourceUrl: string) {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return sourceUrl;
  }
}
