import {
  normalizeKey,
} from "./recommendedProductActions.shared";
import {
  buildResolvedRecommendations,
  dedupeRecommendationsByProductOption,
} from "./recommendedProductActions.scoring";
import type {
  ActionableRecommendation,
  ProductIdScore,
  ProductNameItem,
  RecommendationLine,
  RecommendationLineMatch,
} from "./recommendedProductActions.types";

const PRODUCT_NAME_CATALOG_TTL_MS = 5 * 60 * 1000;
const RECOMMENDATION_RESOLVE_CACHE_TTL_MS = 60 * 1000;
let productNameCatalogPromise: Promise<ProductNameItem[]> | null = null;
let productNameCatalogLoadedAt = 0;
let productNameCatalogRetryAt = 0;
const recommendationResolveCache = new Map<
  string,
  { createdAt: number; promise: Promise<ActionableRecommendation[]> }
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
const CATEGORY_KEYWORD_SET = new Set(
  [
    ...Object.keys(CATEGORY_FALLBACK_ALIASES),
    ...Object.values(CATEGORY_FALLBACK_ALIASES).flat(),
    "종합비타민",
    "멀티비타민",
    "비타민c",
    "비타민d",
    "비타민b",
    "비타민a",
    "오메가3",
    "프로바이오틱스",
    "유산균",
    "루테인",
    "밀크씨슬",
    "마그네슘",
    "아연",
    "칼슘",
    "콜라겐",
    "코엔자임q10",
    "차전자피",
  ].map((entry) => normalizeKey(entry)).filter(Boolean)
);

async function fetchProductNameCatalog() {
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

function scoreNameMatch(targetRaw: string, candidateRaw: string) {
  const targetNorm = normalizeKey(targetRaw);
  const candidateNorm = normalizeKey(candidateRaw);
  if (!targetNorm || !candidateNorm) return -1;
  if (targetNorm === candidateNorm) return 10_000;

  const splitTokens = (value: string) =>
    value
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => normalizeKey(token))
      .filter(Boolean);
  const scoreTokenOverlap = (targetValue: string, candidateValue: string) => {
    const targetTokens = splitTokens(targetValue);
    const candidateTokens = splitTokens(candidateValue);
    if (targetTokens.length === 0 || candidateTokens.length === 0) return 0;

    const targetTokenSet = new Set(targetTokens);
    const candidateTokenSet = new Set(candidateTokens);
    let overlap = 0;
    for (const token of targetTokenSet) {
      if (candidateTokenSet.has(token)) overlap += 1;
    }
    if (overlap === 0) return 0;

    const coverage =
      overlap / Math.max(1, Math.max(targetTokenSet.size, candidateTokenSet.size));
    return overlap * 700 + Math.round(coverage * 400);
  };

  let score = 0;
  if (candidateNorm.includes(targetNorm)) {
    score += 6_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  if (targetNorm.includes(candidateNorm)) {
    score += 4_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  score += scoreTokenOverlap(targetRaw, candidateRaw);

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

function isCategoryLikeProductName(productName: string, category: string) {
  const normalizedName = normalizeKey(productName);
  if (!normalizedName) return true;
  if (CATEGORY_KEYWORD_SET.has(normalizedName)) return true;

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

function findProductCandidatesByName(
  productName: string,
  catalog: ProductNameItem[],
  take = 4
) {
  if (!normalizeKey(productName)) return null;

  const candidates: ProductIdScore[] = [];
  for (const item of catalog) {
    const score = scoreNameMatch(productName, item.name);
    if (score < 0) continue;
    candidates.push({ id: item.id, score, source: "name" });
  }
  const out = candidates
    .filter((candidate) => candidate.score >= 1_000)
    .sort((left, right) => right.score - left.score)
    .slice(0, take);
  return out.length > 0 ? out : null;
}

function findBestProductCandidateByCategory(
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
  return {
    id: best.id,
    score: best.score,
    source: "category" as const,
  };
}

function buildResolveCacheKey(
  lines: RecommendationLine[],
  dedupeByProductOption: boolean
) {
  const lineKey = lines
    .map(
      (item) =>
        `${normalizeKey(item.category)}:${normalizeKey(item.productName)}:${
          item.sourcePrice ?? ""
        }`
    )
    .join("|");
  return `${dedupeByProductOption ? "dedupe" : "keep"}:${lineKey}`;
}

export async function resolveRecommendations(
  lines: RecommendationLine[],
  options?: {
    dedupeByProductOption?: boolean;
  }
) {
  if (!lines.length) return [];
  const dedupeByProductOption = options?.dedupeByProductOption !== false;

  const key = buildResolveCacheKey(lines, dedupeByProductOption);
  if (!key) return [];

  const now = Date.now();
  for (const [cacheKey, entry] of recommendationResolveCache.entries()) {
    if (now - entry.createdAt > RECOMMENDATION_RESOLVE_CACHE_TTL_MS) {
      recommendationResolveCache.delete(cacheKey);
    }
  }

  const cached = recommendationResolveCache.get(key);
  if (cached && now - cached.createdAt <= RECOMMENDATION_RESOLVE_CACHE_TTL_MS) {
    return cached.promise;
  }

  const pending = (async () => {
    const catalog = await fetchProductNameCatalog();
    if (!catalog.length) return [];

    const lineMatches: RecommendationLineMatch[] = [];
    for (const line of lines) {
      const allowCategoryFallback =
        isPlaceholderProductName(line.productName) ||
        isCategoryLikeProductName(line.productName, line.category);

      const nameCandidates = allowCategoryFallback
        ? []
        : findProductCandidatesByName(line.productName, catalog) || [];
      const categoryCandidate = allowCategoryFallback
        ? findBestProductCandidateByCategory(line.category, catalog)
        : null;

      const seen = new Set<number>();
      const candidates: ProductIdScore[] = [];
      for (const candidate of nameCandidates) {
        if (seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        candidates.push(candidate);
      }
      if (categoryCandidate && !seen.has(categoryCandidate.id)) {
        candidates.push(categoryCandidate);
      }
      if (!candidates.length) continue;
      lineMatches.push({ line, candidates });
    }

    if (!lineMatches.length) return [];

    const out = await buildResolvedRecommendations(lineMatches);

    if (!dedupeByProductOption) {
      return out.slice(0, 6);
    }

    return dedupeRecommendationsByProductOption(out, 6);
  })();

  recommendationResolveCache.set(key, { createdAt: Date.now(), promise: pending });
  return pending;
}
