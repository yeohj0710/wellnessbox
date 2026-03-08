import type { ProductNameItem } from "./recommendedProductActions.types";

const PRODUCT_NAME_CATALOG_TTL_MS = 5 * 60 * 1000;

let productNameCatalogPromise: Promise<ProductNameItem[]> | null = null;
let productNameCatalogLoadedAt = 0;
let productNameCatalogRetryAt = 0;

function normalizeCatalogProducts(raw: unknown): ProductNameItem[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as { products?: unknown };
  if (!Array.isArray(record.products)) return [];

  return record.products
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as {
        id?: unknown;
        name?: unknown;
        categories?: unknown;
      };
      const categories = Array.isArray(row.categories)
        ? row.categories
            .map((category) => {
              if (typeof category === "string") return category.trim();
              if (
                category &&
                typeof category === "object" &&
                typeof (category as { name?: unknown }).name === "string"
              ) {
                return (category as { name: string }).name.trim();
              }
              return "";
            })
            .filter(Boolean)
        : [];
      return {
        id: Number(row.id),
        name: typeof row.name === "string" ? row.name.trim() : "",
        categories,
      } satisfies ProductNameItem;
    })
    .filter(
      (item): item is ProductNameItem =>
        item !== null && Number.isFinite(item.id) && Boolean(item.name)
    );
}

export async function fetchProductNameCatalog() {
  const now = Date.now();
  if (now < productNameCatalogRetryAt) return [];
  if (
    productNameCatalogPromise &&
    now - productNameCatalogLoadedAt < PRODUCT_NAME_CATALOG_TTL_MS
  ) {
    return productNameCatalogPromise;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    productNameCatalogRetryAt = now + 4_000;
    return [];
  }

  productNameCatalogPromise = fetch("/api/product/names", {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`product names status ${response.status}`);
      }
      return response.json().catch(() => ({}));
    })
    .then((json) => normalizeCatalogProducts(json))
    .then((items) => {
      productNameCatalogLoadedAt = Date.now();
      return items;
    })
    .catch(() => {
      productNameCatalogRetryAt = Date.now() + 4_000;
      productNameCatalogPromise = null;
      productNameCatalogLoadedAt = 0;
      return [];
    });
  return productNameCatalogPromise;
}
