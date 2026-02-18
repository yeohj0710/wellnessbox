"use client";

import { CATEGORY_LABELS } from "@/lib/categories";

type HomeCategoryLike = {
  name?: string | null;
};

type HomePharmacyProductLike = {
  price?: number | null;
  optionType?: string | null;
  capacity?: string | null;
  stock?: number | null;
};

type HomeProductLike = {
  name?: string | null;
  categories?: HomeCategoryLike[] | null;
  pharmacyProducts?: HomePharmacyProductLike[] | null;
};

type CatalogEntry = {
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

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const MISSING_PRICE_REGEX =
  /\(\s*(가격\s*미정|가격\s*확인\s*중|가격\s*정보\s*없음|가격\s*데이터\s*확인\s*중)\s*\)/;
const RECOMMENDATION_SECTION_REGEX = /추천 제품\s*\(7일\s*기준\s*가격\)/;
const CATEGORY_LINE_REGEX = /^(\s*[-*]?\s*)([^:\n]{1,48})\s*:\s*(.+)$/;

const CATEGORY_SYNONYMS: Record<string, string> = {
  멀티비타민: "종합비타민",
  유산균: "프로바이오틱스(유산균)",
  프로바이오틱스: "프로바이오틱스(유산균)",
  밀크씨슬: "밀크씨슬(실리마린)",
  밀크시슬: "밀크씨슬(실리마린)",
};

const CANONICAL_CATEGORY_LABELS = Object.values(CATEGORY_LABELS);

const catalogCache: CatalogCacheState = {
  loadedAt: 0,
  byCategory: null,
  inFlight: null,
};

function normalizeCategoryToken(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\(.*?\)/g, "");
}

function canonicalizeCategoryLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const aliased = CATEGORY_SYNONYMS[trimmed] || trimmed;
  const source = normalizeCategoryToken(aliased);
  if (!source) return aliased;

  for (const label of CANONICAL_CATEGORY_LABELS) {
    const normalized = normalizeCategoryToken(label);
    if (!normalized) continue;
    if (source.includes(normalized) || normalized.includes(source)) {
      return label;
    }
  }

  return aliased;
}

function extractDayCount(text: string) {
  if (!text) return null;
  const byDay = text.match(/(\d+(?:\.\d+)?)\s*일/);
  if (byDay) {
    const parsed = Number.parseFloat(byDay[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const byUnit = text.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|회|개)/);
  if (byUnit) {
    const parsed = Number.parseFloat(byUnit[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }

  return null;
}

function isExact7DayOption(optionType: string, capacity: string) {
  if (/7\s*일/.test(optionType) || /7\s*일/.test(capacity)) return true;
  if (extractDayCount(optionType) === 7) return true;
  if (extractDayCount(capacity) === 7) return true;
  return false;
}

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
      optionType: typeof option.optionType === "string" ? option.optionType.trim() : "",
      capacity: typeof option.capacity === "string" ? option.capacity.trim() : "",
    }))
    .filter(
      (option): option is { price: number; optionType: string; capacity: string } =>
        option.price != null
    );

  if (usable.length === 0) return null;

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

  const converted = usable
    .map((option) => {
      const days =
        extractDayCount(option.optionType) ?? extractDayCount(option.capacity) ?? null;
      if (!days) return null;
      return {
        name: "",
        sevenDayPrice: Math.max(1, Math.round((option.price / days) * 7)),
        basePrice: option.price,
        optionType: option.optionType,
        capacity: option.capacity,
        priceMode: "converted" as const,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        name: string;
        sevenDayPrice: number;
        basePrice: number;
        optionType: string;
        capacity: string;
        priceMode: "converted";
      } => entry != null
    )
    .sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)[0];

  if (converted) return converted;

  const fallback = [...usable].sort((left, right) => left.price - right.price)[0];
  return {
    name: "",
    sevenDayPrice: fallback.price,
    basePrice: fallback.price,
    optionType: fallback.optionType,
    capacity: fallback.capacity,
    priceMode: "converted",
  };
}

function buildCatalogByCategory(products: HomeProductLike[]) {
  const byCategory = new Map<string, CatalogEntry[]>();

  for (const product of products) {
    const name =
      typeof product?.name === "string" ? product.name.trim() : "";
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
    for (const entry of [...entries].sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)) {
      const exists = byName.get(entry.name);
      if (!exists || entry.sevenDayPrice < exists.sevenDayPrice) {
        byName.set(entry.name, entry);
      }
    }
    byCategory.set(category, Array.from(byName.values()).slice(0, 4));
  }

  return byCategory;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

async function fetchHomeProducts() {
  const response = await fetch("/api/home-data", { method: "GET" });
  if (!response.ok) return [] as HomeProductLike[];
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.products) ? (json.products as HomeProductLike[]) : [];
}

async function loadCatalogByCategory() {
  const now = Date.now();
  if (catalogCache.byCategory && now - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.byCategory;
  }
  if (catalogCache.inFlight) return catalogCache.inFlight;

  catalogCache.inFlight = fetchHomeProducts()
    .then((products) => {
      const byCategory = buildCatalogByCategory(products);
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

export async function hydrateRecommendationPrices(text: string) {
  if (!text) return text;
  if (!RECOMMENDATION_SECTION_REGEX.test(text)) return text;
  if (!MISSING_PRICE_REGEX.test(text)) return text;

  const byCategory = await loadCatalogByCategory();
  if (!byCategory || byCategory.size === 0) return text;

  const lines = text.split("\n");
  const usedNames = new Set<string>();
  let changed = false;

  const nextLines = lines.map((line) => {
    if (!MISSING_PRICE_REGEX.test(line)) return line;

    const match = line.match(CATEGORY_LINE_REGEX);
    if (!match) return line;

    const [, prefix, rawCategory] = match;
    const canonical = canonicalizeCategoryLabel(rawCategory);
    if (!canonical) return line;
    const candidates = byCategory.get(canonical) || [];
    const picked = candidates.find((candidate) => !usedNames.has(candidate.name)) || candidates[0];
    if (!picked) return line;
    usedNames.add(picked.name);

    changed = true;
    return `${prefix}${rawCategory.trim()}: ${picked.name} (${formatKrw(picked.sevenDayPrice)})`;
  });

  return changed ? nextLines.join("\n") : text;
}
