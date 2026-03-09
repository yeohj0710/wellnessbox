import {
  buildResolvedRecommendations,
  dedupeRecommendationsByProductOption,
} from "./recommendedProductActions.scoring";
import { fetchProductNameCatalog } from "./recommendedProductActions.resolve.catalog";
import { findProductCandidatesByName } from "./recommendedProductActions.resolve.name";
import {
  buildResolveCacheKey,
  findCategoryFallbackCandidate,
  shouldAllowCategoryFallback,
} from "./recommendedProductActions.resolve.support";
import type {
  ActionableRecommendation,
  ProductIdScore,
  RecommendationLine,
  RecommendationLineMatch,
} from "./recommendedProductActions.types";

const RECOMMENDATION_RESOLVE_CACHE_TTL_MS = 60 * 1000;

const recommendationResolveCache = new Map<
  string,
  { createdAt: number; promise: Promise<ActionableRecommendation[]> }
>();

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
      const allowCategoryFallback = shouldAllowCategoryFallback(line);

      const nameCandidates = allowCategoryFallback
        ? []
        : findProductCandidatesByName(line.productName, catalog) || [];
      const categoryCandidate = allowCategoryFallback
        ? findCategoryFallbackCandidate(line.category, catalog)
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
