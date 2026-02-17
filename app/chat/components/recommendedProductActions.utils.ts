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
  categories: string[];
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
let productNameCatalogRetryAt = 0;
const recommendationResolveCache = new Map<
  string,
  Promise<ActionableRecommendation[]>
>();
const PLACEHOLDER_PRODUCT_NAME_SET = new Set([
  "제품명",
  "상품명",
  "제품",
  "상품",
  "추천제품",
  "추천상품",
  "영양제",
]);
const GENERIC_CATEGORY_SET = new Set(["추천", "제품", "상품", "기타"]);
const CATEGORY_FALLBACK_ALIASES: Record<string, string[]> = {
  간건강: ["밀크씨슬", "실리마린"],
  체중관리: ["가르시니아", "차전자피"],
  뼈건강: ["칼슘", "비타민d", "마그네슘", "콘드로이친"],
  관절건강: ["콘드로이친", "칼슘", "마그네슘"],
  장건강: ["프로바이오틱스", "유산균", "차전자피"],
  면역건강: ["비타민c", "아연", "종합비타민", "프로바이오틱스"],
  심혈관건강: ["오메가3", "코엔자임q10", "아르기닌"],
  눈건강: ["루테인", "비타민a"],
  피로관리: ["비타민b", "코엔자임q10", "종합비타민"],
  피부건강: ["콜라겐", "비타민c", "아연"],
};

export function normalizeKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function toKrw(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function extractDayCount(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();

  const dayMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:\uC77C|day|days)/i);
  if (dayMatch) {
    const parsed = Number.parseFloat(dayMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const packageLike = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:capsules?|caps?|tablets?|tabs?|\uCEA1\uC290|\uC815|\uD3EC|\uAC1C)/i
  );
  if (packageLike) {
    const parsed = Number.parseFloat(packageLike[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }

  return null;
}

function isExact7DayOption(optionType: string | null, capacity: string | null) {
  const option = optionType || "";
  const cap = capacity || "";
  if (/7\s*(?:\uC77C|day|days)/i.test(option) || /7\s*(?:\uC77C|day|days)/i.test(cap)) {
    return true;
  }
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

  const hasRecommendationHeading = /(추천\s*(제품|상품)|recommended\s*products?)/i.test(
    content
  );

  const lines = content
    .split(/\r?\n/)
    .map((raw) =>
      raw
        .replace(/^\s*#+\s*/, "")
        .replace(/^\s*[•·▪◦]\s*/, "")
        .replace(/^\s*(?:[-*]|\d+\.)\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .trim()
    )
    .filter(Boolean);

  const out: RecommendationLine[] = [];

  const toPrice = (line: string) => {
    const match = line.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
    if (!match) return null;
    const parsed = Number.parseInt(match[1].replace(/,/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cleanupProductName = (line: string) =>
    line
      .replace(/\([^)]*?(\d{1,3}(?:,\d{3})+|\d+)\s*원[^)]*\)/gi, "")
      .replace(/\b7\s*일\s*기준\b/gi, "")
      .replace(/[-|]\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원.*$/i, "")
      .replace(/(\d{1,3}(?:,\d{3})+|\d+)\s*원.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  for (const cleaned of lines) {
    if (
      out.length > 0 &&
      /^(추가|원하시면|필요하면|다음|참고|안내|장바구니를|프로필)/.test(cleaned)
    ) {
      break;
    }

    const hasStructuredSeparator = /[:\-|]/.test(cleaned);
    const sourcePrice = toPrice(cleaned);
    const looksLikeProductLine = /[가-힣A-Za-z]{2,}/.test(cleaned);
    const looksLikeProductPriceLine =
      /[가-힣A-Za-z].*(\d{1,3}(?:,\d{3})+|\d+)\s*원/.test(cleaned);
    const looksLikeSummaryLine =
      /(합계|총액|배송|할인|쿠폰|결제|주문번호|주문일)/.test(cleaned);

    if (
      sourcePrice == null &&
      (!hasRecommendationHeading || !hasStructuredSeparator || !looksLikeProductLine)
    ) {
      continue;
    }

    if (!hasRecommendationHeading && !hasStructuredSeparator && !looksLikeProductPriceLine) {
      continue;
    }
    if (looksLikeSummaryLine && !hasStructuredSeparator) {
      continue;
    }

    let category = "추천";
    let detail = cleaned;

    const colon = cleaned.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);
    if (colon) {
      category = colon[1].trim();
      detail = colon[2].trim();
    } else {
      const dash = cleaned.match(/^(.+?)\s*[-|]\s*(.+)$/);
      if (dash) {
        detail = dash[1].trim();
      }
    }

    const productName = cleanupProductName(detail);
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
  const now = Date.now();
  if (now < productNameCatalogRetryAt) return [];
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    productNameCatalogRetryAt = now + 4_000;
    return [];
  }

  if (productNameCatalogPromise) return productNameCatalogPromise;
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
    .then((json) =>
      Array.isArray(json?.products)
        ? json.products
            .map((item: any) => ({
              id: Number(item?.id),
              name: typeof item?.name === "string" ? item.name.trim() : "",
              categories: Array.isArray(item?.categories)
                ? item.categories
                    .map((category: any) =>
                      typeof category === "string"
                        ? category.trim()
                        : typeof category?.name === "string"
                          ? category.name.trim()
                          : ""
                    )
                    .filter(Boolean)
                : [],
            }))
            .filter((item: ProductNameItem) => Number.isFinite(item.id) && item.name)
        : []
    )
    .catch(() => {
      productNameCatalogRetryAt = Date.now() + 4_000;
      productNameCatalogPromise = null;
      return [];
    });
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

function isPlaceholderProductName(value: string) {
  const normalized = normalizeKey(value);
  if (!normalized) return true;
  return PLACEHOLDER_PRODUCT_NAME_SET.has(normalized);
}

function isGenericCategory(value: string) {
  const normalized = normalizeKey(value);
  if (!normalized) return true;
  return GENERIC_CATEGORY_SET.has(normalized);
}

function buildCategoryAliases(rawCategory: string) {
  const aliases = new Set<string>();
  const normalized = normalizeKey(rawCategory);
  if (normalized) aliases.add(normalized);

  const compact = normalized
    .replace(/건강|관리|기능|제품|추천/g, "")
    .trim();
  if (compact) aliases.add(compact);

  const rawTokens = rawCategory
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => normalizeKey(token))
    .filter(Boolean);
  for (const token of rawTokens) {
    aliases.add(token);
  }

  const aliasSeed = Array.from(aliases);
  for (const key of aliasSeed) {
    const extras = CATEGORY_FALLBACK_ALIASES[key] || [];
    for (const extra of extras) {
      const normalizedExtra = normalizeKey(extra);
      if (normalizedExtra) aliases.add(normalizedExtra);
    }
  }

  return Array.from(aliases).filter(Boolean);
}

function scoreCategoryMatch(category: string, item: ProductNameItem) {
  if (isGenericCategory(category)) return -1;
  const targetAliases = buildCategoryAliases(category);
  if (targetAliases.length === 0) return -1;

  const categoryAliases = item.categories
    .map((entry) => normalizeKey(entry))
    .filter(Boolean);
  if (categoryAliases.length === 0) return -1;

  let best = -1;
  for (const target of targetAliases) {
    for (const categoryAlias of categoryAliases) {
      if (target === categoryAlias) {
        best = Math.max(best, 10_000);
        continue;
      }
      if (target.length >= 2 && categoryAlias.includes(target)) {
        best = Math.max(best, 8_000 - Math.abs(categoryAlias.length - target.length));
      }
      if (categoryAlias.length >= 2 && target.includes(categoryAlias)) {
        best = Math.max(best, 7_000 - Math.abs(categoryAlias.length - target.length));
      }
    }
  }
  return best;
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

function findBestProductIdByCategory(
  category: string,
  catalog: ProductNameItem[]
) {
  if (isGenericCategory(category)) return null;

  let best: { id: number; score: number } | null = null;
  for (const item of catalog) {
    const score = scoreCategoryMatch(category, item);
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

    const lineMatches: Array<{ line: RecommendationLine; productId: number }> = [];
    for (const line of lines) {
      const productIdByName = isPlaceholderProductName(line.productName)
        ? null
        : findBestProductIdByName(line.productName, catalog);
      const productIdByCategory = findBestProductIdByCategory(line.category, catalog);
      const productId = productIdByName ?? productIdByCategory;
      if (typeof productId !== "number") continue;
      lineMatches.push({ line, productId });
    }

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

