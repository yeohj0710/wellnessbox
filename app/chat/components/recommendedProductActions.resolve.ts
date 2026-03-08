import {
  normalizeKey,
} from "./recommendedProductActions.shared";
import {
  buildResolvedRecommendations,
  dedupeRecommendationsByProductOption,
} from "./recommendedProductActions.scoring";
import {
  isCategoryLikeProductName,
  isPlaceholderProductName,
} from "./recommendedProductActions.resolve.category";
import { fetchProductNameCatalog } from "./recommendedProductActions.resolve.catalog";
import { findProductCandidatesByName } from "./recommendedProductActions.resolve.name";
import type {
  ActionableRecommendation,
  ProductIdScore,
  ProductNameItem,
  RecommendationLine,
  RecommendationLineMatch,
} from "./recommendedProductActions.types";

const RECOMMENDATION_RESOLVE_CACHE_TTL_MS = 60 * 1000;
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
        isPlaceholderProductName(
          line.productName,
          PLACEHOLDER_PRODUCT_NAME_SET
        ) ||
        isCategoryLikeProductName(
          line.productName,
          line.category,
          CATEGORY_KEYWORD_SET
        );

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
