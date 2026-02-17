import {
  mergeClientCartItems,
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";

type RecommendationLine = {
  category: string;
  productName: string;
  sourcePrice: number | null;
};

type ProductNameItem = {
  id: number;
  name: string;
};

type CartProductItem = {
  id: number;
  name: string;
  images: string[];
  pharmacyProducts: Array<{
    price: number | null;
    optionType: string | null;
    capacity: string | null;
    stock: number | null;
  }>;
};

export type ActionableRecommendation = {
  category: string;
  productId: number;
  productName: string;
  optionType: string;
  capacity: string | null;
  packagePrice: number;
  sevenDayPrice: number;
  sourcePrice: number | null;
};

let productNameCatalogPromise: Promise<ProductNameItem[]> | null = null;
const recommendationResolveCache = new Map<
  string,
  Promise<ActionableRecommendation[]>
>();

export function normalizeKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

export function toKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function extractDayCount(value: string | null | undefined) {
  if (!value) return null;
  const direct = value.match(/(\d+(?:\.\d+)?)\s*일/);
  if (direct) {
    const parsed = Number.parseFloat(direct[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const packageLike = value.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|회|개)/);
  if (packageLike) {
    const parsed = Number.parseFloat(packageLike[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }
  return null;
}

function isExact7DayOption(optionType: string | null, capacity: string | null) {
  const option = optionType || "";
  const cap = capacity || "";
  if (/7\s*일/.test(option) || /7\s*일/.test(cap)) return true;
  if (extractDayCount(option) === 7) return true;
  if (extractDayCount(cap) === 7) return true;
  return false;
}

function toSevenDayPrice(option: {
  price: number;
  optionType: string | null;
  capacity: string | null;
}) {
  const days =
    extractDayCount(option.optionType) ?? extractDayCount(option.capacity) ?? null;
  if (!days) return option.price;
  return Math.max(1, Math.round((option.price / days) * 7));
}

export function parseRecommendationLines(content: string): RecommendationLine[] {
  if (!content) return [];
  const start = content.search(/추천 제품\s*\(7일 기준 가격\)/i);
  if (start < 0) return [];

  const section = content.slice(start).split(/\r?\n/).slice(1);
  const out: RecommendationLine[] = [];

  for (const rawLine of section) {
    const cleaned = rawLine
      .replace(/^\s*[-*]\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (!cleaned) continue;

    if (
      out.length > 0 &&
      /^(이렇게|추가 질문|추가로|원하시면|궁금한 점|참고|다음)/.test(cleaned)
    ) {
      break;
    }

    const row = cleaned.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);
    if (!row) continue;

    const category = row[1].trim();
    const detail = row[2].trim();
    const sourcePriceMatch = detail.match(/([\d,]+)\s*원/);
    const sourcePrice = sourcePriceMatch
      ? Number.parseInt(sourcePriceMatch[1].replace(/,/g, ""), 10)
      : null;

    const productName = detail
      .replace(/\([\d,\s]*원[^)]*\)\s*$/g, "")
      .trim()
      .replace(/\s{2,}/g, " ");

    if (!productName) continue;
    out.push({ category, productName, sourcePrice });
  }

  const deduped: RecommendationLine[] = [];
  const seen = new Set<string>();
  for (const item of out) {
    const key = `${normalizeKey(item.category)}:${normalizeKey(item.productName)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 6);
}

async function fetchProductNameCatalog() {
  if (productNameCatalogPromise) return productNameCatalogPromise;
  productNameCatalogPromise = fetch("/api/product/names", {
    method: "GET",
    cache: "no-store",
  })
    .then((response) => response.json().catch(() => ({})))
    .then((json) =>
      Array.isArray(json?.products)
        ? json.products
            .map((item: any) => ({
              id: Number(item?.id),
              name: typeof item?.name === "string" ? item.name.trim() : "",
            }))
            .filter((item: ProductNameItem) => Number.isFinite(item.id) && item.name)
        : []
    )
    .catch(() => []);
  return productNameCatalogPromise;
}

function scoreNameMatch(targetNorm: string, candidateNorm: string) {
  if (!targetNorm || !candidateNorm) return -1;
  if (targetNorm === candidateNorm) return 10_000;

  let score = 0;
  if (candidateNorm.includes(targetNorm)) {
    score += 6_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  if (targetNorm.includes(candidateNorm)) {
    score += 4_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }

  const maxPrefix = Math.min(targetNorm.length, candidateNorm.length, 12);
  let prefix = 0;
  while (prefix < maxPrefix && targetNorm[prefix] === candidateNorm[prefix]) {
    prefix += 1;
  }
  score += prefix * 50;
  return score;
}

function findBestProductIdByName(
  productName: string,
  catalog: ProductNameItem[]
) {
  const targetNorm = normalizeKey(productName);
  if (!targetNorm) return null;

  let best: { id: number; score: number } | null = null;
  for (const item of catalog) {
    const score = scoreNameMatch(targetNorm, normalizeKey(item.name));
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { id: item.id, score };
    }
  }
  if (!best || best.score < 1_000) return null;
  return best.id;
}

async function fetchCartProducts(ids: number[]) {
  const response = await fetch("/api/cart-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.products) ? (json.products as CartProductItem[]) : [];
}

function pickBestCartOption(product: CartProductItem) {
  const options = Array.isArray(product?.pharmacyProducts)
    ? product.pharmacyProducts
        .map((item) => ({
          price: typeof item?.price === "number" ? item.price : null,
          optionType:
            typeof item?.optionType === "string" ? item.optionType.trim() : null,
          capacity: typeof item?.capacity === "string" ? item.capacity.trim() : null,
          stock: typeof item?.stock === "number" ? item.stock : 0,
        }))
        .filter((item) => item.price != null && item.price > 0 && item.stock > 0)
        .filter((item) => Boolean(item.optionType))
    : [];

  if (!options.length) return null;

  const exact7 = options
    .filter((item) => isExact7DayOption(item.optionType, item.capacity))
    .sort((left, right) => (left.price as number) - (right.price as number))[0];

  if (exact7) {
    return {
      optionType: exact7.optionType as string,
      capacity: exact7.capacity,
      packagePrice: exact7.price as number,
      sevenDayPrice: exact7.price as number,
    };
  }

  const cheapest = [...options].sort(
    (left, right) => (left.price as number) - (right.price as number)
  )[0];

  return {
    optionType: cheapest.optionType as string,
    capacity: cheapest.capacity,
    packagePrice: cheapest.price as number,
    sevenDayPrice: toSevenDayPrice({
      price: cheapest.price as number,
      optionType: cheapest.optionType,
      capacity: cheapest.capacity,
    }),
  };
}

export async function resolveRecommendations(lines: RecommendationLine[]) {
  if (!lines.length) return [];

  const key = lines
    .map((item) => `${normalizeKey(item.category)}:${normalizeKey(item.productName)}`)
    .join("|");
  if (!key) return [];

  const cached = recommendationResolveCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const catalog = await fetchProductNameCatalog();
    if (!catalog.length) return [];

    const lineMatches = lines
      .map((line) => ({
        line,
        productId: findBestProductIdByName(line.productName, catalog),
      }))
      .filter(
        (
          item
        ): item is { line: RecommendationLine; productId: number } =>
          typeof item.productId === "number"
      );

    if (!lineMatches.length) return [];

    const ids = Array.from(new Set(lineMatches.map((item) => item.productId)));
    const products = await fetchCartProducts(ids);
    const productById = new Map(products.map((item) => [item.id, item]));

    const out: ActionableRecommendation[] = [];
    for (const { line, productId } of lineMatches) {
      const product = productById.get(productId);
      if (!product || !product.name) continue;
      const option = pickBestCartOption(product);
      if (!option) continue;

      out.push({
        category: line.category,
        productId: product.id,
        productName: product.name,
        optionType: option.optionType,
        capacity: option.capacity,
        packagePrice: option.packagePrice,
        sevenDayPrice: option.sevenDayPrice,
        sourcePrice: line.sourcePrice,
      });
    }

    const deduped: ActionableRecommendation[] = [];
    const seen = new Set<string>();
    for (const item of out) {
      const key = `${item.productId}:${normalizeKey(item.optionType)}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped.slice(0, 6);
  })();

  recommendationResolveCache.set(key, pending);
  return pending;
}

export function updateCartItems(items: ActionableRecommendation[]) {
  if (typeof window === "undefined" || items.length === 0) return;

  const additions = items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    optionType: item.optionType,
    quantity: 1,
  }));
  const merged = mergeClientCartItems(readClientCartItems(), additions);
  writeClientCartItems(merged);
  window.dispatchEvent(new Event("cartUpdated"));
}

export function hasSavedRoadAddress() {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("roadAddress");
  return typeof saved === "string" && saved.trim().length > 0;
}
