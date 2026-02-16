export type CategoryLite = {
  id: number;
  name: string;
  image?: string | null;
  importance?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCategory(value: unknown): CategoryLite | null {
  if (!isRecord(value)) return null;

  const id = asFiniteNumber(value.id);
  const name = typeof value.name === "string" ? value.name : null;

  if (id === null || !name) return null;

  return {
    id,
    name,
    image: typeof value.image === "string" ? value.image : null,
    importance: asFiniteNumber(value.importance),
  };
}

function normalizeCategoryList(payload: unknown): CategoryLite[] {
  const rawList = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.categories)
    ? payload.categories
    : [];

  return rawList
    .map((item) => normalizeCategory(item))
    .filter((item): item is CategoryLite => !!item);
}

export async function fetchCategories(
  signal?: AbortSignal
): Promise<CategoryLite[]> {
  const res = await fetch("/api/categories", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  const payload = await res.json().catch(() => null);
  return normalizeCategoryList(payload);
}
