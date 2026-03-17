import { CODE_TO_LABEL } from "@/lib/categories";

export type CapabilityCategory = {
  id: number;
  name: string;
};

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function resolveMatchedCategoriesByLabels<T extends CapabilityCategory>(
  labels: string[],
  categories: T[]
) {
  if (!labels.length || !categories.length) return [] as T[];

  const byName = new Map(
    categories.map((category) => [normalizeLabel(category.name), category])
  );

  return labels
    .map((label) => {
      const normalized = normalizeLabel(label);
      const direct = byName.get(normalized);
      if (direct) return direct;
      const mapped = CODE_TO_LABEL[label] ?? label;
      return byName.get(normalizeLabel(mapped)) ?? null;
    })
    .filter((category): category is T => category !== null)
    .filter(
      (category, index, array) =>
        array.findIndex((item) => item.id === category.id) === index
    )
    .slice(0, 3);
}

export function resolveMatchedCategoryIdsByLabels(
  labels: string[],
  categories: CapabilityCategory[] | undefined
) {
  if (!categories?.length) return [];
  return resolveMatchedCategoriesByLabels(labels, categories).map(
    (category) => category.id
  );
}
