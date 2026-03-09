import { CATEGORY_LABELS } from "@/lib/categories";

const DEFAULT_PRODUCT_BRIEF_CACHE_TTL_MS = 5 * 60 * 1000;

type ProductBriefCacheState = {
  value: string;
  loadedAt: number;
  inFlight: Promise<string> | null;
};

type ChatCatalogLike = Array<{
  category?: string;
  products?: Array<{
    name?: string;
    optionType?: string | null;
    capacity?: string | null;
    sevenDayPrice?: number;
    priceMode?: "exact7d" | "converted" | string;
    basePrice?: number;
  }>;
}>;

const productBriefCache: ProductBriefCacheState = {
  value: "",
  loadedAt: 0,
  inFlight: null,
};

const CATEGORY_SYNONYMS: Record<string, string> = {
  "멀티비타민": "종합비타민",
  "프로바이오틱스": "프로바이오틱스·유산균",
  "유산균": "프로바이오틱스·유산균",
  "밀크씨슬": "밀크씨슬(간·피로관리)",
  "밀크시슬": "밀크씨슬(간·피로관리)",
};

function normalizeCategoryName(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\(.*?\)/g, "");
}

function parseDaysFromCapacity(capacity: unknown) {
  const text = typeof capacity === "string" ? capacity : "";
  if (!text) return 30;
  const numbers = (text.match(/\d+(?:\.\d+)?/g) || [])
    .map((token) => Number.parseFloat(token))
    .filter((value) => Number.isFinite(value) && value > 0);
  const likelyDays = numbers.find((value) => value >= 7 && value <= 180);
  if (likelyDays) return likelyDays;
  return 30;
}

function formatKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function mapCategoryLabel(raw: string) {
  const aliased = CATEGORY_SYNONYMS[raw.trim()] || raw.trim();
  const source = normalizeCategoryName(aliased);
  if (!source) return "";
  for (const label of Object.values(CATEGORY_LABELS)) {
    const normalizedLabel = normalizeCategoryName(label);
    if (!normalizedLabel) continue;
    if (source.includes(normalizedLabel) || normalizedLabel.includes(source)) {
      return label;
    }
  }
  return aliased;
}

function buildProductBriefFromCatalog(catalog: ChatCatalogLike) {
  const productsByCategory = new Map<
    string,
    Array<{
      name: string;
      optionType: string;
      capacity: string;
      price: number;
      sevenDayPrice: number;
      priceMode: "exact7d" | "converted";
    }>
  >();

  for (const item of catalog) {
    const rawCategory = typeof item.category === "string" ? item.category : "";
    const label = mapCategoryLabel(rawCategory);
    if (!label) continue;
    const products = Array.isArray(item.products) ? item.products : [];
    if (products.length === 0) continue;

    for (const product of products) {
      const name = typeof product.name === "string" ? product.name.trim() : "";
      if (!name) continue;
      const sevenDayPrice =
        typeof product.sevenDayPrice === "number" ? product.sevenDayPrice : NaN;
      const basePrice =
        typeof product.basePrice === "number" ? product.basePrice : NaN;
      if (!Number.isFinite(sevenDayPrice) || sevenDayPrice <= 0) continue;
      if (!Number.isFinite(basePrice) || basePrice <= 0) continue;

      const capacity =
        typeof product.capacity === "string" ? product.capacity.trim() : "";
      const optionType =
        typeof product.optionType === "string" ? product.optionType.trim() : "";
      const priceMode = product.priceMode === "exact7d" ? "exact7d" : "converted";
      const bucket = productsByCategory.get(label) || [];
      bucket.push({
        name,
        optionType,
        capacity,
        price: basePrice,
        sevenDayPrice,
        priceMode,
      });
      productsByCategory.set(label, bucket);
    }
  }

  const lines: string[] = [];
  const entries = Array.from(productsByCategory.entries()).sort((left, right) =>
    left[0].localeCompare(right[0], "ko")
  );

  for (const [label, items] of entries) {
    const uniqueByName = new Map<string, (typeof items)[number]>();
    for (const item of [...items].sort(
      (left, right) => left.sevenDayPrice - right.sevenDayPrice
    )) {
      const current = uniqueByName.get(item.name);
      if (!current || item.sevenDayPrice < current.sevenDayPrice) {
        uniqueByName.set(item.name, item);
      }
    }

    const briefItems = Array.from(uniqueByName.values())
      .sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)
      .slice(0, 3);
    if (!briefItems.length) continue;

    const line = `${label}: ${briefItems
      .map((item) => {
        const capacityText = item.capacity ? `, ${item.capacity}` : "";
        const optionText = item.optionType ? `, ${item.optionType}` : "";
        const modeText = item.priceMode === "converted" ? ", 7일 환산" : "";
        return `${item.name}(${formatKrw(item.sevenDayPrice)} / 7일 기준 가격${modeText}, 패키지 ${formatKrw(item.price)}${optionText}${capacityText})`;
      })
      .join(" | ")}`;

    if (lines.concat(line).join("\n").length > 8000) break;
    lines.push(line);
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}

function buildProductBriefFromSummaries(products: Array<Record<string, any>>) {
  const normalizedCatalog: ChatCatalogLike = [];

  for (const product of products) {
    const name = typeof product.name === "string" ? product.name : "";
    if (!name) continue;
    const priceValue =
      typeof product.price === "number"
        ? product.price
        : typeof product.price === "string"
          ? Number.parseFloat(product.price)
          : NaN;
    if (!Number.isFinite(priceValue) || priceValue <= 0) continue;

    const capacity =
      typeof product.capacity === "string" ? product.capacity.trim() : "";
    const optionType =
      typeof product.optionType === "string" ? product.optionType.trim() : "";
    const baseDays = parseDaysFromCapacity(optionType || capacity || "");
    const sevenDayPrice = Math.max(1, Math.round((priceValue / baseDays) * 7));

    const rawCategories = Array.isArray(product.categories) ? product.categories : [];
    const categories = rawCategories
      .map((category) => (typeof category === "string" ? category : ""))
      .filter(Boolean);

    for (const category of categories) {
      normalizedCatalog.push({
        category,
        products: [
          {
            name,
            optionType,
            capacity,
            sevenDayPrice,
            priceMode: baseDays === 7 ? "exact7d" : "converted",
            basePrice: priceValue,
          },
        ],
      });
    }
  }

  return buildProductBriefFromCatalog(normalizedCatalog);
}

async function loadProductBrief() {
  try {
    const mod = await import("@/lib/product/product");
    if (typeof mod.getChatProductCatalog === "function") {
      const catalog = await mod.getChatProductCatalog();
      if (Array.isArray(catalog) && catalog.length > 0) {
        const brief = buildProductBriefFromCatalog(catalog as ChatCatalogLike);
        if (brief) return brief;
      }
    }

    if (typeof mod.getProductSummaries !== "function") return "";
    const products = await mod.getProductSummaries(500);
    if (!Array.isArray(products) || products.length === 0) return "";
    return buildProductBriefFromSummaries(products as Array<Record<string, any>>);
  } catch {
    return "";
  }
}

function refreshProductBriefCache() {
  if (productBriefCache.inFlight) return productBriefCache.inFlight;

  const pending = loadProductBrief()
    .then((value) => {
      productBriefCache.value = value || "";
      productBriefCache.loadedAt = Date.now();
      return productBriefCache.value;
    })
    .catch(() => productBriefCache.value || "")
    .finally(() => {
      productBriefCache.inFlight = null;
    });

  productBriefCache.inFlight = pending;
  return pending;
}

function getProductBriefCacheTtlMs() {
  const raw = Number.parseInt(
    process.env.CHAT_PRODUCT_BRIEF_CACHE_TTL_MS || "",
    10
  );
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PRODUCT_BRIEF_CACHE_TTL_MS;
  return raw;
}

export async function loadProductBriefCached() {
  const now = Date.now();
  const ttlMs = getProductBriefCacheTtlMs();
  if (productBriefCache.value && now - productBriefCache.loadedAt < ttlMs) {
    return productBriefCache.value;
  }

  if (productBriefCache.value) {
    void refreshProductBriefCache();
    return productBriefCache.value;
  }

  return refreshProductBriefCache();
}

export function warmProductBriefCache() {
  return refreshProductBriefCache();
}
