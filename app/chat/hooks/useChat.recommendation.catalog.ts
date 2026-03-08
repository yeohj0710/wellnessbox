import {
  isExact7DayOption,
  toSevenDayPrice,
} from "../components/recommendedProductActions.shared";

export type HomeCategoryLike = {
  name?: string | null;
};

export type HomePharmacyProductLike = {
  price?: number | null;
  optionType?: string | null;
  capacity?: string | null;
  stock?: number | null;
};

export type HomeProductLike = {
  name?: string | null;
  categories?: HomeCategoryLike[] | null;
  pharmacyProducts?: HomePharmacyProductLike[] | null;
};

export type CatalogEntry = {
  name: string;
  sevenDayPrice: number;
  basePrice: number;
  optionType: string;
  capacity: string;
  priceMode: "exact7d" | "converted";
};

type CatalogCacheState = {
  loadedAt: number;
  byCategory: Map<string, CatalogEntry[]> | null;
  inFlight: Promise<Map<string, CatalogEntry[]>> | null;
};

type CanonicalizeCategoryLabel = (raw: string) => string;

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

const catalogCache: CatalogCacheState = {
  loadedAt: 0,
  byCategory: null,
  inFlight: null,
};

function toPositivePrice(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function pickBestOption(
  options: HomePharmacyProductLike[] | null | undefined
): CatalogEntry | null {
  const usable = (options || [])
    .filter((option) => (option.stock ?? 0) > 0)
    .map((option) => ({
      price: toPositivePrice(option.price),
      optionType:
        typeof option.optionType === "string" ? option.optionType.trim() : "",
      capacity:
        typeof option.capacity === "string" ? option.capacity.trim() : "",
    }))
    .filter(
      (option): option is { price: number; optionType: string; capacity: string } =>
        option.price != null
    );

  if (!usable.length) return null;

  const exact = usable
    .filter((option) => isExact7DayOption(option.optionType, option.capacity))
    .sort((left, right) => left.price - right.price)[0];
  if (exact) {
    return {
      name: "",
      sevenDayPrice: exact.price,
      basePrice: exact.price,
      optionType: exact.optionType,
      capacity: exact.capacity,
      priceMode: "exact7d",
    };
  }

  const cheapest = [...usable].sort((left, right) => left.price - right.price)[0];
  return {
    name: "",
    sevenDayPrice: toSevenDayPrice({
      price: cheapest.price,
      optionType: cheapest.optionType,
      capacity: cheapest.capacity,
    }),
    basePrice: cheapest.price,
    optionType: cheapest.optionType,
    capacity: cheapest.capacity,
    priceMode: "converted",
  };
}

export function buildCatalogByCategory(
  products: HomeProductLike[],
  canonicalizeCategoryLabel: CanonicalizeCategoryLabel
) {
  const byCategory = new Map<string, CatalogEntry[]>();

  for (const product of products) {
    const name = typeof product?.name === "string" ? product.name.trim() : "";
    if (!name) continue;

    const picked = pickBestOption(product.pharmacyProducts);
    if (!picked) continue;
    const withName: CatalogEntry = { ...picked, name };

    const categories = Array.isArray(product.categories)
      ? product.categories
          .map((category) =>
            typeof category?.name === "string" ? category.name.trim() : ""
          )
          .filter(Boolean)
      : [];

    for (const rawCategory of categories) {
      const canonical = canonicalizeCategoryLabel(rawCategory);
      if (!canonical) continue;
      const bucket = byCategory.get(canonical) || [];
      bucket.push(withName);
      byCategory.set(canonical, bucket);
    }
  }

  for (const [category, entries] of byCategory) {
    const byName = new Map<string, CatalogEntry>();
    for (const entry of [...entries].sort(
      (left, right) => left.sevenDayPrice - right.sevenDayPrice
    )) {
      const existing = byName.get(entry.name);
      if (!existing || entry.sevenDayPrice < existing.sevenDayPrice) {
        byName.set(entry.name, entry);
      }
    }
    byCategory.set(category, Array.from(byName.values()).slice(0, 4));
  }

  return byCategory;
}

async function fetchHomeProducts() {
  const response = await fetch("/api/home-data", { method: "GET" });
  if (!response.ok) return [] as HomeProductLike[];
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.products) ? (json.products as HomeProductLike[]) : [];
}

export async function loadCatalogByCategory(
  canonicalizeCategoryLabel: CanonicalizeCategoryLabel
) {
  const now = Date.now();
  if (
    catalogCache.byCategory &&
    now - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS
  ) {
    return catalogCache.byCategory;
  }
  if (catalogCache.inFlight) return catalogCache.inFlight;

  catalogCache.inFlight = fetchHomeProducts()
    .then((products) => {
      const byCategory = buildCatalogByCategory(
        products,
        canonicalizeCategoryLabel
      );
      catalogCache.byCategory = byCategory;
      catalogCache.loadedAt = Date.now();
      return byCategory;
    })
    .catch(() => catalogCache.byCategory || new Map<string, CatalogEntry[]>())
    .finally(() => {
      catalogCache.inFlight = null;
    });

  return catalogCache.inFlight;
}
