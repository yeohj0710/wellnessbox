import { normalizeKey } from "./recommendedProductActions.shared";

export function isPlaceholderProductName(
  value: string,
  placeholderProductNameSet: ReadonlySet<string>
) {
  const normalized = normalizeKey(value);
  if (!normalized) return true;
  return placeholderProductNameSet.has(normalized);
}

export function isCategoryLikeProductName(
  productName: string,
  category: string,
  categoryKeywordSet: ReadonlySet<string>
) {
  const normalizedName = normalizeKey(productName);
  if (!normalizedName) return true;
  if (categoryKeywordSet.has(normalizedName)) return true;

  const normalizedCategory = normalizeKey(category);
  if (normalizedCategory && normalizedName === normalizedCategory) return true;
  if (
    normalizedCategory &&
    normalizedName.length >= 2 &&
    (normalizedName.includes(normalizedCategory) ||
      normalizedCategory.includes(normalizedName))
  ) {
    return true;
  }

  return false;
}
