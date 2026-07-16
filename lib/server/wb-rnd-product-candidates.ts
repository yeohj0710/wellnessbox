import "server-only";

import contractJson from "@/contracts/wb-rnd/product-candidate-match-v1.json";
import { getProductCandidateCatalog } from "@/lib/product/product.catalog";
import { WB_RND_INGREDIENT_MAPPING_VERSION } from "@/lib/server/wb-rnd-ingredient-map";

type JsonRecord = Record<string, unknown>;

export type WbRndProductCatalogItem = {
  id: number;
  name: string;
  categories: string[];
};

type ProductMatchMapping = {
  serviceIngredientId: string;
  matchTerms: string[];
};

type ProductCandidateContract = {
  schemaVersion: "wb_rnd_product_candidate_match_v1";
  mappingVersion: string;
  ingredientMappingVersion: string;
  productCatalogSource: string;
  maxCandidatesPerIngredient: number;
  mappings: ProductMatchMapping[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function loadContract(value: unknown): ProductCandidateContract {
  if (!isRecord(value))
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_contract");
  if (
    value.schema_version !== "wb_rnd_product_candidate_match_v1" ||
    !nonEmptyString(value.mapping_version) ||
    value.ingredient_mapping_version !== WB_RND_INGREDIENT_MAPPING_VERSION ||
    !nonEmptyString(value.product_catalog_source) ||
    !Number.isInteger(value.max_candidates_per_ingredient) ||
    Number(value.max_candidates_per_ingredient) < 1 ||
    Number(value.max_candidates_per_ingredient) > 20 ||
    !Array.isArray(value.mappings)
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_contract");
  }

  const seenServiceIds = new Set<string>();
  const mappings = value.mappings.map((raw): ProductMatchMapping => {
    if (!isRecord(raw)) throw new Error("WB_RND_PRODUCT_MATCH_invalid_mapping");
    const serviceIngredientId = raw.service_ingredient_id;
    const matchTerms = raw.match_terms;
    if (
      !nonEmptyString(serviceIngredientId) ||
      !/^ING:[A-Z0-9_]+$/.test(serviceIngredientId) ||
      seenServiceIds.has(serviceIngredientId) ||
      !Array.isArray(matchTerms) ||
      matchTerms.length === 0 ||
      !matchTerms.every(nonEmptyString)
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_invalid_mapping");
    }
    const normalizedTerms = matchTerms.map((term) => normalize(term));
    if (
      normalizedTerms.some((term) => term.length < 2) ||
      new Set(normalizedTerms).size !== normalizedTerms.length
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_invalid_mapping");
    }
    seenServiceIds.add(serviceIngredientId);
    return { serviceIngredientId, matchTerms: [...matchTerms] };
  });

  return {
    schemaVersion: value.schema_version,
    mappingVersion: value.mapping_version,
    ingredientMappingVersion: value.ingredient_mapping_version,
    productCatalogSource: value.product_catalog_source,
    maxCandidatesPerIngredient: Number(value.max_candidates_per_ingredient),
    mappings,
  };
}

const contract = loadContract(contractJson);
const mappingByServiceIngredient = new Map(
  contract.mappings.map((mapping) => [mapping.serviceIngredientId, mapping])
);

function validateCatalog(value: unknown): WbRndProductCatalogItem[] {
  if (!Array.isArray(value))
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
  const seenProductIds = new Set<number>();
  return value.map((raw) => {
    if (!isRecord(raw)) throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
    const id = raw.id;
    const name = raw.name;
    const categories = raw.categories;
    if (
      !Number.isInteger(id) ||
      Number(id) < 1 ||
      seenProductIds.has(Number(id)) ||
      !nonEmptyString(name) ||
      !Array.isArray(categories) ||
      !categories.every(nonEmptyString)
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
    }
    seenProductIds.add(Number(id));
    return {
      id: Number(id),
      name: name.trim(),
      categories: categories.map((item) => item.trim()),
    };
  });
}

function candidatesForIngredient(
  serviceIngredientId: string,
  catalog: WbRndProductCatalogItem[]
) {
  const mapping = mappingByServiceIngredient.get(serviceIngredientId);
  if (!mapping)
    throw new Error("WB_RND_PRODUCT_MATCH_unmapped_service_ingredient");
  const terms = mapping.matchTerms.map((term) => ({
    raw: term,
    normalized: normalize(term),
  }));
  return catalog
    .flatMap((product) => {
      const normalizedName = normalize(product.name);
      const normalizedCategories = product.categories.map(normalize);
      const nameTerm = terms.find((term) =>
        normalizedName.includes(term.normalized)
      );
      const categoryTerm = terms.find((term) =>
        normalizedCategories.some((category) =>
          category.includes(term.normalized)
        )
      );
      const matched = nameTerm ?? categoryTerm;
      if (!matched) return [];
      return [
        {
          product_id: product.id,
          product_name: product.name,
          categories: product.categories,
          match_basis: nameTerm
            ? ("product_name" as const)
            : ("category" as const),
          matched_term: matched.raw,
          match_rank: nameTerm ? 2 : 1,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.match_rank - left.match_rank || left.product_id - right.product_id
    )
    .slice(0, contract.maxCandidatesPerIngredient)
    .map(({ match_rank: _matchRank, ...candidate }) => candidate);
}

export async function listWbRndProductCatalog(): Promise<
  WbRndProductCatalogItem[]
> {
  const products = await getProductCandidateCatalog();
  return products
    .filter((product): product is typeof product & { name: string } =>
      nonEmptyString(product.name)
    )
    .map((product) => ({
      id: product.id,
      name: product.name.trim(),
      categories: product.categories
        .map((category) => category.name?.trim() ?? "")
        .filter(Boolean),
    }));
}

export function attachWbRndProductCandidates(
  value: JsonRecord,
  rawCatalog: unknown
) {
  if (!Array.isArray(value.recommendations)) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_recommendations");
  }
  const catalog = validateCatalog(rawCatalog);
  const recommendations = value.recommendations.map((raw) => {
    if (!isRecord(raw) || !nonEmptyString(raw.service_ingredient_id)) {
      throw new Error("WB_RND_PRODUCT_MATCH_missing_service_ingredient");
    }
    const productCandidates = candidatesForIngredient(
      raw.service_ingredient_id,
      catalog
    );
    return {
      ...raw,
      product_candidates: productCandidates,
      product_candidate_status:
        productCandidates.length > 0 ? "MATCHED" : "NO_MATCH",
    };
  });
  const matchedRecommendationCount = recommendations.filter(
    (item) => item.product_candidate_status === "MATCHED"
  ).length;
  return {
    ...value,
    recommendations,
    product_candidate_resolution: {
      schema_version: contract.schemaVersion,
      mapping_version: contract.mappingVersion,
      ingredient_mapping_version: contract.ingredientMappingVersion,
      product_catalog_source: contract.productCatalogSource,
      catalog_product_count: catalog.length,
      recommendation_count: recommendations.length,
      matched_recommendation_count: matchedRecommendationCount,
      complete: matchedRecommendationCount === recommendations.length,
    },
  };
}

export const WB_RND_PRODUCT_CANDIDATE_MAPPING_VERSION = contract.mappingVersion;
