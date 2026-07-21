import "server-only";

import { createHash } from "node:crypto";

import contractJson from "@/contracts/wb-rnd/product-candidate-match-v1.json";
import { getProductCandidateCatalog } from "@/lib/product/product.catalog";
import { normalizeProductDetailFacts } from "@/lib/product/product-detail-facts";
import {
  mapRndIngredientToService,
  WB_RND_INGREDIENT_MAPPING_VERSION,
} from "@/lib/server/wb-rnd-ingredient-map";

type JsonRecord = Record<string, unknown>;
type ProductFormulationKind =
  | "capsule"
  | "tablet"
  | "powder"
  | "liquid"
  | "gummy"
  | "other";

export type WbRndProductCatalogItem = {
  id: number;
  name: string;
  categories: string[];
  ingredientDeclarations: Array<{ label: string; value: string }>;
  ingredientAmounts: NormalizedIngredientAmount[];
  formulation: string;
  formulationKind: ProductFormulationKind;
  offers: Array<{
    pharmacyProductId: number;
    priceKrw: number;
    stockCount: number;
    optionType: string | null;
    capacity: string | null;
  }>;
};

type ProductMatchMapping = {
  serviceIngredientId: string;
  matchTerms: string[];
};

type ProductCandidateContract = {
  schemaVersion: "wb_rnd_product_candidate_match_v1";
  mappingVersion: string;
  ingredientMappingVersion: string;
  catalogContractVersion: "wb_rnd_selling_product_catalog_v1";
  combinationContractVersion: "wb_rnd_product_combination_v1";
  optimizationConstraintsContractVersion: "product_optimization_constraints_v1";
  combinationFilterContractVersion: "product_combination_filter_v1";
  combinationRankingContractVersion: "product_combination_ranking_v1";
  catalogVersionContractVersion: "product_catalog_content_sha256_v1";
  inventoryContextContractVersion: "product_combination_inventory_context_v1";
  stockSubstitutionContractVersion: "product_combination_stock_substitution_v1";
  cartCandidateContractVersion: "product_combination_cart_candidate_v1";
  productCatalogSource: string;
  maxCandidatesPerIngredient: number;
  maxProductCombinations: number;
  maxProductCombinationSearchStates: number;
  maxRankedProductCombinations: number;
  mappings: ProductMatchMapping[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIngredientFactText(value: string) {
  return /(?:성분|원료|함량|ingredient|active)/i.test(value);
}

function hasDeclaredAmount(value: string) {
  return /(?:\d\s*(?:mg|mcg|ug|μg|iu|g\b))/i.test(value);
}

function classifyFormulation(value: string): ProductFormulationKind {
  const normalized = value.trim().toLowerCase();
  if (/(?:캡슐|capsule)/i.test(normalized)) return "capsule";
  if (/(?:정제|tablet)/i.test(normalized)) return "tablet";
  if (/(?:분말|powder)/i.test(normalized)) return "powder";
  if (/(?:액상|액체|liquid)/i.test(normalized)) return "liquid";
  if (/(?:구미|gummy)/i.test(normalized)) return "gummy";
  return "other";
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
    value.catalog_contract_version !== "wb_rnd_selling_product_catalog_v1" ||
    value.combination_contract_version !== "wb_rnd_product_combination_v1" ||
    value.optimization_constraints_contract_version !==
      "product_optimization_constraints_v1" ||
    value.combination_filter_contract_version !== "product_combination_filter_v1" ||
    value.combination_ranking_contract_version !== "product_combination_ranking_v1" ||
    value.catalog_version_contract_version !== "product_catalog_content_sha256_v1" ||
    value.inventory_context_contract_version !==
      "product_combination_inventory_context_v1" ||
    value.stock_substitution_contract_version !==
      "product_combination_stock_substitution_v1" ||
    value.cart_candidate_contract_version !==
      "product_combination_cart_candidate_v1" ||
    value.ingredient_mapping_version !== WB_RND_INGREDIENT_MAPPING_VERSION ||
    !nonEmptyString(value.product_catalog_source) ||
    !Number.isInteger(value.max_candidates_per_ingredient) ||
    Number(value.max_candidates_per_ingredient) < 1 ||
    Number(value.max_candidates_per_ingredient) > 20 ||
    !Number.isInteger(value.max_product_combinations) ||
    Number(value.max_product_combinations) < 1 ||
    Number(value.max_product_combinations) > 256 ||
    !Number.isInteger(value.max_product_combination_search_states) ||
    Number(value.max_product_combination_search_states) < 1 ||
    Number(value.max_product_combination_search_states) > 100_000 ||
    !Number.isInteger(value.max_ranked_product_combinations) ||
    Number(value.max_ranked_product_combinations) < 1 ||
    Number(value.max_ranked_product_combinations) > 10 ||
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
    catalogContractVersion: value.catalog_contract_version,
    combinationContractVersion: value.combination_contract_version,
    optimizationConstraintsContractVersion:
      value.optimization_constraints_contract_version,
    combinationFilterContractVersion: value.combination_filter_contract_version,
    combinationRankingContractVersion: value.combination_ranking_contract_version,
    catalogVersionContractVersion: value.catalog_version_contract_version,
    inventoryContextContractVersion: value.inventory_context_contract_version,
    stockSubstitutionContractVersion: value.stock_substitution_contract_version,
    cartCandidateContractVersion: value.cart_candidate_contract_version,
    productCatalogSource: value.product_catalog_source,
    maxCandidatesPerIngredient: Number(value.max_candidates_per_ingredient),
    maxProductCombinations: Number(value.max_product_combinations),
    maxProductCombinationSearchStates: Number(
      value.max_product_combination_search_states
    ),
    maxRankedProductCombinations: Number(value.max_ranked_product_combinations),
    mappings,
  };
}

const contract = loadContract(contractJson);
const mappingByServiceIngredient = new Map(
  contract.mappings.map((mapping) => [mapping.serviceIngredientId, mapping])
);

type NormalizedIngredientAmount = {
  service_ingredient_id: string;
  normalized_amount: number;
  normalized_unit: "ng" | "milli_IU";
  source_label: string;
  source_value: string;
};

function parseIngredientAmount(
  declaration: { label: string; value: string }
): NormalizedIngredientAmount {
  const combined = normalize(`${declaration.label} ${declaration.value}`);
  const matchedServiceIds = contract.mappings
    .filter((mapping) =>
      mapping.matchTerms.some((term) => combined.includes(normalize(term)))
    )
    .map((mapping) => mapping.serviceIngredientId);
  if (new Set(matchedServiceIds).size !== 1) {
    throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
  }
  const amounts = Array.from(
    declaration.value.matchAll(/(\d+(?:\.\d+)?)\s*(mcg|ug|µg|μg|mg|g|iu)\b/gi)
  );
  if (amounts.length !== 1 || /(?:-|~|to|per\s+day|daily|x\s*\d)/i.test(declaration.value)) {
    throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
  }
  const rawAmountText = amounts[0][1];
  const rawAmount = Number(rawAmountText);
  const rawUnit = amounts[0][2].toLowerCase();
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
  }
  const normalizedUnit = rawUnit === "iu" ? "milli_IU" : "ng";
  const multiplier =
    rawUnit === "g"
      ? BigInt(1_000_000_000)
      : rawUnit === "mg"
        ? BigInt(1_000_000)
        : rawUnit === "iu"
          ? BigInt(1_000)
          : BigInt(1_000);
  const [whole, fraction = ""] = rawAmountText.split(".");
  const numerator = BigInt(`${whole}${fraction}`) * multiplier;
  const denominator = BigInt(10) ** BigInt(fraction.length);
  if (numerator % denominator !== BigInt(0)) {
    throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
  }
  const normalizedBigInt = numerator / denominator;
  if (normalizedBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
  }
  const normalizedAmount = Number(normalizedBigInt);
  return {
    service_ingredient_id: matchedServiceIds[0],
    normalized_amount: normalizedAmount,
    normalized_unit: normalizedUnit,
    source_label: declaration.label,
    source_value: declaration.value,
  };
}

function validateCatalog(value: unknown): WbRndProductCatalogItem[] {
  if (!Array.isArray(value))
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
  const seenProductIds = new Set<number>();
  const seenPharmacyProductIds = new Set<number>();
  return value.map((raw) => {
    if (!isRecord(raw)) throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
    const id = raw.id;
    const name = raw.name;
    const categories = raw.categories;
    const ingredientDeclarations = raw.ingredientDeclarations;
    const formulation = raw.formulation;
    const formulationKind = raw.formulationKind;
    const offers = raw.offers;
    if (
      !Number.isInteger(id) ||
      Number(id) < 1 ||
      seenProductIds.has(Number(id)) ||
      !nonEmptyString(name) ||
      !Array.isArray(categories) ||
      categories.length === 0 ||
      !categories.every(nonEmptyString) ||
      !Array.isArray(ingredientDeclarations) ||
      ingredientDeclarations.length === 0 ||
      !Array.isArray(offers) ||
      offers.length === 0 ||
      !nonEmptyString(formulation) ||
      formulationKind !== classifyFormulation(formulation)
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
    }
    seenProductIds.add(Number(id));
    const declarations = ingredientDeclarations.map((entry) => {
      if (
        !isRecord(entry) ||
        !nonEmptyString(entry.label) ||
        !nonEmptyString(entry.value) ||
        !isIngredientFactText(entry.label) ||
        !hasDeclaredAmount(entry.value)
      ) {
        throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
      }
      return { label: entry.label.trim(), value: entry.value.trim() };
    });
    const ingredientAmounts = declarations.map(parseIngredientAmount);
    if (
      new Set(ingredientAmounts.map((item) => item.service_ingredient_id)).size !==
      ingredientAmounts.length
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount");
    }
    const normalizedOffers = offers.map((entry) => {
      if (
        !isRecord(entry) ||
        !Number.isInteger(entry.pharmacyProductId) ||
        Number(entry.pharmacyProductId) < 1 ||
        !Number.isInteger(entry.priceKrw) ||
        Number(entry.priceKrw) < 0 ||
        !Number.isInteger(entry.stockCount) ||
        Number(entry.stockCount) < 1 ||
        !(entry.optionType === null || nonEmptyString(entry.optionType)) ||
        !(entry.capacity === null || nonEmptyString(entry.capacity))
      ) {
        throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
      }
      if (seenPharmacyProductIds.has(Number(entry.pharmacyProductId))) {
        throw new Error("WB_RND_PRODUCT_MATCH_invalid_catalog");
      }
      seenPharmacyProductIds.add(Number(entry.pharmacyProductId));
      return {
        pharmacyProductId: Number(entry.pharmacyProductId),
        priceKrw: Number(entry.priceKrw),
        stockCount: Number(entry.stockCount),
        optionType: entry.optionType === null ? null : entry.optionType.trim(),
        capacity: entry.capacity === null ? null : entry.capacity.trim(),
      };
    });
    return {
      id: Number(id),
      name: name.trim(),
      categories: categories.map((item) => item.trim()),
      ingredientDeclarations: declarations,
      ingredientAmounts,
      formulation: formulation.trim(),
      formulationKind: classifyFormulation(formulation),
      offers: normalizedOffers.sort(
        (left, right) =>
          left.priceKrw - right.priceKrw ||
          left.pharmacyProductId - right.pharmacyProductId
      ),
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
      if (
        !matched ||
        !product.ingredientAmounts.some(
          (item) => item.service_ingredient_id === serviceIngredientId
        )
      ) {
        return [];
      }
      return [
        {
          product_id: product.id,
          product_name: product.name,
          categories: product.categories,
          match_basis: nameTerm
            ? ("product_name" as const)
            : ("category" as const),
          matched_term: matched.raw,
          ingredients: product.categories,
          ingredient_declarations: product.ingredientDeclarations.map((item) => ({
            label: item.label,
            value: item.value,
          })),
          ingredient_amounts: product.ingredientAmounts.map((item) => ({ ...item })),
          formulation: product.formulation,
          formulation_kind: product.formulationKind,
          offers: product.offers.map((offer) => ({
            pharmacy_product_id: offer.pharmacyProductId,
            price_krw: offer.priceKrw,
            stock_count: offer.stockCount,
            option_type: offer.optionType,
            capacity: offer.capacity,
          })),
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

type ProductCandidate = ReturnType<typeof candidatesForIngredient>[number];

type ProductOptimizationConstraints = {
  maxTotalCostKrw: number;
  maxProducts: number;
  excludedRndIngredientKeys: string[];
  excludedServiceIngredientIds: Set<string>;
  safetyRuleIds: string[];
};

function validateProductOptimizationConstraints(
  value: unknown
): ProductOptimizationConstraints {
  if (!isRecord(value)) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_optimization_constraints");
  }
  const expectedKeys = [
    "excluded_ingredient_keys",
    "max_products",
    "max_total_cost_krw",
    "safety_rule_ids",
    "schema_version",
  ];
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys) ||
    value.schema_version !== contract.optimizationConstraintsContractVersion ||
    !Number.isSafeInteger(value.max_total_cost_krw) ||
    Number(value.max_total_cost_krw) < 0 ||
    !Number.isSafeInteger(value.max_products) ||
    Number(value.max_products) < 1 ||
    Number(value.max_products) > 20 ||
    !Array.isArray(value.excluded_ingredient_keys) ||
    !value.excluded_ingredient_keys.every(nonEmptyString) ||
    !Array.isArray(value.safety_rule_ids) ||
    !value.safety_rule_ids.every(nonEmptyString)
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_optimization_constraints");
  }
  const excludedRndIngredientKeys = value.excluded_ingredient_keys.map(String);
  const safetyRuleIds = value.safety_rule_ids.map(String);
  if (
    JSON.stringify(excludedRndIngredientKeys) !==
      JSON.stringify([...new Set(excludedRndIngredientKeys)].sort()) ||
    JSON.stringify(safetyRuleIds) !==
      JSON.stringify([...new Set(safetyRuleIds)].sort()) ||
    (excludedRndIngredientKeys.length > 0 && safetyRuleIds.length === 0)
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_optimization_constraints");
  }
  const excludedServiceIngredientIds = new Set<string>();
  for (const ingredientKey of excludedRndIngredientKeys) {
    const serviceIngredientId = mapRndIngredientToService(ingredientKey);
    if (serviceIngredientId === null) {
      throw new Error("WB_RND_PRODUCT_MATCH_unmapped_safety_exclusion");
    }
    excludedServiceIngredientIds.add(serviceIngredientId);
  }
  return {
    maxTotalCostKrw: Number(value.max_total_cost_krw),
    maxProducts: Number(value.max_products),
    excludedRndIngredientKeys,
    excludedServiceIngredientIds,
    safetyRuleIds,
  };
}

export function assertWbRndProductOptimizationConstraints(value: JsonRecord) {
  validateProductOptimizationConstraints(value.product_optimization_constraints);
}

function buildProductCombinations(
  recommendations: Array<JsonRecord & { product_candidates: ProductCandidate[] }>,
  constraints: ProductOptimizationConstraints
) {
  if (
    recommendations.length === 0 ||
    recommendations.some((item) => item.product_candidates.length === 0)
  ) {
    return {
      combinations: [],
      searchStateCount: 0,
      searchTruncated: false,
      combinationLimitReached: false,
      preFilterCombinationCount: 0,
      budgetExcludedCount: 0,
      productCountExcludedCount: 0,
      safetyExcludedCount: 0,
      evaluatedCombinations: [],
    };
  }
  const eligible = new Map<string, ReturnType<typeof materializeCombination>>();
  const evaluated = new Map<string, ReturnType<typeof materializeCombination>>();
  const preFilterIdentities = new Set<string>();
  const budgetExcludedIdentities = new Set<string>();
  const productCountExcludedIdentities = new Set<string>();
  const safetyExcludedIdentities = new Set<string>();
  const visitedStates = new Set<string>();
  let searchStateCount = 0;
  let searchTruncated = false;
  const visit = (index: number, selected: ProductCandidate[]) => {
    const selectedIdentity = [...new Set(selected.map((item) => item.product_id))]
      .sort((left, right) => left - right)
      .join(",");
    const stateKey = `${index}|${selectedIdentity}`;
    if (visitedStates.has(stateKey)) return;
    if (searchStateCount >= contract.maxProductCombinationSearchStates) {
      searchTruncated = true;
      return;
    }
    visitedStates.add(stateKey);
    searchStateCount += 1;
    if (index === recommendations.length) {
      const combination = materializeCombination(recommendations, selected);
      if (preFilterIdentities.has(combination.combination_id)) return;
      preFilterIdentities.add(combination.combination_id);
      evaluated.set(combination.combination_id, combination);
      if (combination.total_cost_krw > constraints.maxTotalCostKrw) {
        budgetExcludedIdentities.add(combination.combination_id);
      }
      if (combination.product_count > constraints.maxProducts) {
        productCountExcludedIdentities.add(combination.combination_id);
      }
      if (
        combination.ingredient_totals.some((item) =>
          constraints.excludedServiceIngredientIds.has(item.service_ingredient_id)
        )
      ) {
        safetyExcludedIdentities.add(combination.combination_id);
      }
      if (
        !budgetExcludedIdentities.has(combination.combination_id) &&
        !productCountExcludedIdentities.has(combination.combination_id) &&
        !safetyExcludedIdentities.has(combination.combination_id)
      ) {
        eligible.set(combination.combination_id, combination);
      }
      return;
    }
    for (const candidate of recommendations[index].product_candidates) {
      visit(index + 1, [...selected, candidate]);
    }
  };
  visit(0, []);
  const rankedEligible = [...eligible.values()].sort(
    (left, right) =>
      left.total_cost_krw - right.total_cost_krw ||
      left.product_count - right.product_count ||
      left.combination_id.localeCompare(right.combination_id)
  );
  return {
    combinations: rankedEligible
      .slice(0, contract.maxProductCombinations)
      .sort((left, right) => left.combination_id.localeCompare(right.combination_id)),
    searchStateCount,
    searchTruncated,
    combinationLimitReached: eligible.size > contract.maxProductCombinations,
    preFilterCombinationCount: preFilterIdentities.size,
    budgetExcludedCount: budgetExcludedIdentities.size,
    productCountExcludedCount: productCountExcludedIdentities.size,
    safetyExcludedCount: safetyExcludedIdentities.size,
    evaluatedCombinations: [...evaluated.values()].sort((left, right) =>
      left.combination_id.localeCompare(right.combination_id)
    ),
  };
}

function canonicalSha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

type ProductCombinationInventoryContext = {
  schema_version: "product_combination_inventory_context_v1";
  previous_catalog_version: string;
  previous_combination_id: string;
  previous_replay_identity: {
    schema_version: "product_combination_replay_identity_v1";
    input_sha256: string;
    catalog_version: string;
    catalog_version_contract: string;
    result_sha256: string;
    optimization_input: JsonRecord;
  };
  previous_safety_constraints: {
    excluded_ingredient_keys: string[];
    safety_rule_ids: string[];
  };
  previous_selections: Array<{
    product_id: number;
    pharmacy_product_id: number;
  }>;
};

function validateProductCombinationInventoryContext(
  value: unknown
): ProductCombinationInventoryContext | null {
  if (value === undefined) return null;
  if (!isRecord(value)) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
  }
  const expectedKeys = [
    "previous_catalog_version",
    "previous_combination_id",
    "previous_replay_identity",
    "previous_safety_constraints",
    "previous_selections",
    "schema_version",
  ];
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys) ||
    value.schema_version !== contract.inventoryContextContractVersion ||
    !nonEmptyString(value.previous_catalog_version) ||
    !/^catalog_[a-f0-9]{64}$/.test(value.previous_catalog_version) ||
    !nonEmptyString(value.previous_combination_id) ||
    !/^combo_[a-f0-9]{16}$/.test(value.previous_combination_id) ||
    !isRecord(value.previous_replay_identity) ||
    JSON.stringify(Object.keys(value.previous_replay_identity).sort()) !==
      JSON.stringify([
        "catalog_version",
        "catalog_version_contract",
        "input_sha256",
        "optimization_input",
        "result_sha256",
        "schema_version",
      ]) ||
    value.previous_replay_identity.schema_version !==
      "product_combination_replay_identity_v1" ||
    value.previous_replay_identity.catalog_version !== value.previous_catalog_version ||
    value.previous_replay_identity.catalog_version_contract !==
      contract.catalogVersionContractVersion ||
    !/^[a-f0-9]{64}$/.test(String(value.previous_replay_identity.input_sha256)) ||
    !/^[a-f0-9]{64}$/.test(String(value.previous_replay_identity.result_sha256)) ||
    !isRecord(value.previous_replay_identity.optimization_input) ||
    canonicalSha256(value.previous_replay_identity.optimization_input) !==
      value.previous_replay_identity.input_sha256 ||
    !isRecord(value.previous_safety_constraints) ||
    JSON.stringify(Object.keys(value.previous_safety_constraints).sort()) !==
      JSON.stringify(["excluded_ingredient_keys", "safety_rule_ids"]) ||
    !Array.isArray(value.previous_safety_constraints.excluded_ingredient_keys) ||
    !value.previous_safety_constraints.excluded_ingredient_keys.every(nonEmptyString) ||
    !Array.isArray(value.previous_safety_constraints.safety_rule_ids) ||
    !value.previous_safety_constraints.safety_rule_ids.every(nonEmptyString) ||
    !Array.isArray(value.previous_selections) ||
    value.previous_selections.length === 0
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
  }
  const previousSelections = value.previous_selections.map((selection) => {
    if (
      !isRecord(selection) ||
      JSON.stringify(Object.keys(selection).sort()) !==
        JSON.stringify(["pharmacy_product_id", "product_id"]) ||
      !Number.isSafeInteger(selection.product_id) ||
      Number(selection.product_id) < 1 ||
      !Number.isSafeInteger(selection.pharmacy_product_id) ||
      Number(selection.pharmacy_product_id) < 1
    ) {
      throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
    }
    return {
      product_id: Number(selection.product_id),
      pharmacy_product_id: Number(selection.pharmacy_product_id),
    };
  });
  const sortedSelections = [...previousSelections].sort(
    (left, right) =>
      left.product_id - right.product_id ||
      left.pharmacy_product_id - right.pharmacy_product_id
  );
  if (
    JSON.stringify(previousSelections) !== JSON.stringify(sortedSelections) ||
    new Set(previousSelections.map((item) => item.product_id)).size !==
      previousSelections.length ||
    new Set(previousSelections.map((item) => item.pharmacy_product_id)).size !==
      previousSelections.length
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
  }
  const expectedCombinationId = `combo_${canonicalSha256(previousSelections).slice(0, 16)}`;
  const previousExcludedIngredientKeys =
    value.previous_safety_constraints.excluded_ingredient_keys.map(String);
  const previousSafetyRuleIds = value.previous_safety_constraints.safety_rule_ids.map(String);
  const previousOptimizationConstraints = isRecord(
    value.previous_replay_identity.optimization_input.constraints
  )
    ? value.previous_replay_identity.optimization_input.constraints
    : null;
  if (value.previous_combination_id !== expectedCombinationId) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
  }
  if (
    JSON.stringify(previousExcludedIngredientKeys) !==
      JSON.stringify([...new Set(previousExcludedIngredientKeys)].sort()) ||
    JSON.stringify(previousSafetyRuleIds) !==
      JSON.stringify([...new Set(previousSafetyRuleIds)].sort()) ||
    (previousExcludedIngredientKeys.length > 0 && previousSafetyRuleIds.length === 0)
    || previousOptimizationConstraints === null
    || JSON.stringify(previousOptimizationConstraints.excluded_ingredient_keys) !==
      JSON.stringify(previousExcludedIngredientKeys)
    || JSON.stringify(previousOptimizationConstraints.safety_rule_ids) !==
      JSON.stringify(previousSafetyRuleIds)
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_inventory_context");
  }
  return {
    schema_version: contract.inventoryContextContractVersion,
    previous_catalog_version: value.previous_catalog_version,
    previous_combination_id: value.previous_combination_id,
    previous_replay_identity: {
      schema_version: "product_combination_replay_identity_v1",
      input_sha256: String(value.previous_replay_identity.input_sha256),
      catalog_version: String(value.previous_replay_identity.catalog_version),
      catalog_version_contract: String(
        value.previous_replay_identity.catalog_version_contract
      ),
      result_sha256: String(value.previous_replay_identity.result_sha256),
      optimization_input: value.previous_replay_identity.optimization_input,
    },
    previous_safety_constraints: {
      excluded_ingredient_keys: previousExcludedIngredientKeys,
      safety_rule_ids: previousSafetyRuleIds,
    },
    previous_selections: previousSelections,
  };
}

export function extractWbRndProductCombinationContext(body: JsonRecord) {
  const context = validateProductCombinationInventoryContext(
    body.product_combination_context
  );
  const { product_combination_context: _context, ...upstreamBody } = body;
  return { context, upstreamBody };
}

function canonicalCatalogIdentity(catalog: WbRndProductCatalogItem[]) {
  return [...catalog]
    .sort((left, right) => left.id - right.id)
    .map((product) => ({
      id: product.id,
      name: product.name,
      categories: [...product.categories].sort(),
      ingredient_declarations: [...product.ingredientDeclarations]
        .map((item) => ({ label: item.label, value: item.value }))
        .sort(
          (left, right) =>
            left.label.localeCompare(right.label) ||
            left.value.localeCompare(right.value)
        ),
      ingredient_amounts: [...product.ingredientAmounts].sort(
        (left, right) =>
          left.service_ingredient_id.localeCompare(right.service_ingredient_id) ||
          left.normalized_unit.localeCompare(right.normalized_unit) ||
          left.normalized_amount - right.normalized_amount ||
          left.source_label.localeCompare(right.source_label) ||
          left.source_value.localeCompare(right.source_value)
      ),
      formulation: product.formulation,
      formulation_kind: product.formulationKind,
      offers: [...product.offers]
        .map((offer) => ({
          pharmacy_product_id: offer.pharmacyProductId,
          price_krw: offer.priceKrw,
          stock_count: offer.stockCount,
          option_type: offer.optionType,
          capacity: offer.capacity,
        }))
        .sort((left, right) =>
          left.pharmacy_product_id - right.pharmacy_product_id
        ),
    }));
}

function catalogVersion(catalog: WbRndProductCatalogItem[]) {
  return `catalog_${canonicalSha256(canonicalCatalogIdentity(catalog))}`;
}

function canonicalRecommendationInput(
  recommendations: JsonRecord[],
  constraints: ProductOptimizationConstraints
) {
  const canonicalRecommendations = recommendations
    .map((item) => ({
      ingredient: item.ingredient,
      service_ingredient_id: item.service_ingredient_id,
      rank: item.rank,
      score: item.score,
      evidence_ids: Array.isArray(item.evidence_ids)
        ? [...item.evidence_ids].map(String).sort()
        : [],
    }))
    .sort(
      (left, right) =>
        Number(left.rank) - Number(right.rank) ||
        String(left.service_ingredient_id).localeCompare(
          String(right.service_ingredient_id)
        )
    );
  return {
    recommendations: canonicalRecommendations,
    constraints: {
      max_total_cost_krw: constraints.maxTotalCostKrw,
      max_products: constraints.maxProducts,
      excluded_ingredient_keys: constraints.excludedRndIngredientKeys,
      excluded_service_ingredient_ids: [...constraints.excludedServiceIngredientIds].sort(),
      safety_rule_ids: constraints.safetyRuleIds,
    },
  };
}

export function buildWbRndProductCatalogIdentityForEvidence(rawCatalog: unknown) {
  return canonicalCatalogIdentity(validateCatalog(rawCatalog));
}

function rankProductCombinations(
  combinationResult: ReturnType<typeof buildProductCombinations>,
  constraints: ProductOptimizationConstraints,
  inputSha256: string,
  catalogVersionValue: string
) {
  const ranked = combinationResult.evaluatedCombinations
    .filter(
      (item) =>
        item.total_cost_krw <= constraints.maxTotalCostKrw &&
        item.product_count <= constraints.maxProducts &&
        !item.ingredient_totals.some((total) =>
          constraints.excludedServiceIngredientIds.has(total.service_ingredient_id)
        )
    )
    .sort(
    (left, right) =>
      left.total_cost_krw - right.total_cost_krw ||
      left.product_count - right.product_count ||
      left.combination_id.localeCompare(right.combination_id)
    );
  const topK = (combinationResult.searchTruncated
    ? []
    : ranked.slice(0, contract.maxRankedProductCombinations)
  )
    .map((item, index) => ({
      schema_version: contract.combinationRankingContractVersion,
      rank: index + 1,
      combination_id: item.combination_id,
      ranking_tuple: [
        item.total_cost_krw,
        item.product_count,
        item.combination_id,
      ] as [number, number, string],
    }));
  const topIdentities = new Set(topK.map((item) => item.combination_id));
  const eligibleIdentities = new Set(
    combinationResult.evaluatedCombinations
      .filter(
        (item) =>
          item.total_cost_krw <= constraints.maxTotalCostKrw &&
          item.product_count <= constraints.maxProducts &&
          !item.ingredient_totals.some((total) =>
            constraints.excludedServiceIngredientIds.has(
              total.service_ingredient_id
            )
          )
      )
      .map((item) => item.combination_id)
  );
  const rankingCutoff = topK.length > 0 ? ranked[topK.length - 1] : undefined;
  const nonSelection = combinationResult.evaluatedCombinations
    .filter((item) => !topIdentities.has(item.combination_id))
    .map((item) => {
      const reasons: string[] = [];
      if (item.total_cost_krw > constraints.maxTotalCostKrw) {
        reasons.push("OVER_BUDGET");
      }
      if (item.product_count > constraints.maxProducts) {
        reasons.push("OVER_MAX_PRODUCTS");
      }
      if (
        item.ingredient_totals.some((total) =>
          constraints.excludedServiceIngredientIds.has(
            total.service_ingredient_id
          )
        )
      ) {
        reasons.push("SAFETY_EXCLUDED_INGREDIENT");
      }
      if (eligibleIdentities.has(item.combination_id)) {
        if (combinationResult.searchTruncated) {
          reasons.push("SEARCH_TRUNCATED");
        } else if (
          rankingCutoff &&
          item.total_cost_krw > rankingCutoff.total_cost_krw
        ) {
          reasons.push("HIGHER_COST");
        } else if (
          rankingCutoff &&
          item.product_count > rankingCutoff.product_count
        ) {
          reasons.push("MORE_PRODUCTS");
        } else {
          reasons.push("DETERMINISTIC_ID_TIE_BREAK");
        }
      }
      return {
        combination_id: item.combination_id,
        reason_codes: reasons.sort(),
      };
    })
    .sort((left, right) => left.combination_id.localeCompare(right.combination_id));
  const resultSha256 = canonicalSha256({
    schema_version: contract.combinationRankingContractVersion,
    input_sha256: inputSha256,
    catalog_version: catalogVersionValue,
    top_k: topK,
    non_selection: nonSelection,
  });
  return { topK, nonSelection, resultSha256 };
}

function materializeCombination(
  recommendations: Array<JsonRecord & { product_candidates: ProductCandidate[] }>,
  choices: ProductCandidate[]
) {
  const productById = new Map<number, ProductCandidate>();
  choices.forEach((choice) => productById.set(choice.product_id, choice));
  const selectedProducts = [...productById.values()]
    .sort((left, right) => left.product_id - right.product_id)
    .map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      formulation_kind: product.formulation_kind,
      offer: product.offers[0],
      ingredient_amounts: product.ingredient_amounts,
    }));
  const aggregate = new Map<
    string,
    { serviceIngredientId: string; unit: "ng" | "milli_IU"; amount: number; productIds: Set<number> }
  >();
  const ingredientProductIds = new Map<string, Set<number>>();
  for (const product of selectedProducts) {
    for (const amount of product.ingredient_amounts) {
      const key = `${amount.service_ingredient_id}:${amount.normalized_unit}`;
      const current = aggregate.get(key) ?? {
        serviceIngredientId: amount.service_ingredient_id,
        unit: amount.normalized_unit,
        amount: 0,
        productIds: new Set<number>(),
      };
      current.amount += amount.normalized_amount;
      current.productIds.add(product.product_id);
      aggregate.set(key, current);
      const allProductIds =
        ingredientProductIds.get(amount.service_ingredient_id) ?? new Set<number>();
      allProductIds.add(product.product_id);
      ingredientProductIds.set(amount.service_ingredient_id, allProductIds);
    }
  }
  const ingredientTotals = [...aggregate.values()]
    .sort(
      (left, right) =>
        left.serviceIngredientId.localeCompare(right.serviceIngredientId) ||
        left.unit.localeCompare(right.unit)
    )
    .map((item) => ({
      service_ingredient_id: item.serviceIngredientId,
      total_declared_amount: item.amount,
      unit: item.unit,
      product_ids: [...item.productIds].sort((left, right) => left - right),
      duplicate_across_products:
        (ingredientProductIds.get(item.serviceIngredientId)?.size ?? 0) > 1,
    }));
  const identity = selectedProducts.map((product) => ({
    product_id: product.product_id,
    pharmacy_product_id: product.offer.pharmacy_product_id,
  }));
  const combinationId = `combo_${createHash("sha256")
    .update(JSON.stringify(identity))
    .digest("hex")
    .slice(0, 16)}`;
  return {
    schema_version: contract.combinationContractVersion,
    combination_id: combinationId,
    recommendation_service_ingredient_ids: recommendations.map(
      (item) => item.service_ingredient_id
    ),
    selected_products: selectedProducts,
    product_count: selectedProducts.length,
    total_cost_krw: selectedProducts.reduce(
      (total, product) => total + product.offer.price_krw,
      0
    ),
    ingredient_totals: ingredientTotals,
    duplicate_ingredient_ids: [
      ...new Set(
        ingredientTotals
          .filter((item) => item.duplicate_across_products)
          .map((item) => item.service_ingredient_id)
      ),
    ].sort(),
  };
}

export async function listWbRndProductCatalog(): Promise<
  WbRndProductCatalogItem[]
> {
  const products = await getProductCandidateCatalog();
  return products
    .filter((product): product is typeof product & { name: string } =>
      nonEmptyString(product.name) && product.pharmacyProducts.length > 0
    )
    .map((product) => {
      const facts = normalizeProductDetailFacts(product.detailFacts);
      const factRows = [
        ...(facts?.highlights ?? []),
        ...(facts?.groups.flatMap((group) => group.rows) ?? []),
      ];
      const ingredientDeclarations = [
        ...(facts?.highlights ?? []).filter((row) =>
          isIngredientFactText(row.label)
        ),
        ...(facts?.groups.flatMap((group) =>
          group.rows.filter(
            (row) =>
              isIngredientFactText(group.title) ||
              isIngredientFactText(row.label)
          )
        ) ?? []),
      ].filter((row) => hasDeclaredAmount(row.value));
      const ingredientAmounts = ingredientDeclarations.map((row) =>
        parseIngredientAmount({ label: row.label, value: row.value })
      );
      const formulation =
        factRows.find((row) =>
          /(?:제형|형태|formulation|dosage form)/i.test(row.label)
        )?.value ?? null;
      return {
        id: product.id,
        name: product.name.trim(),
        categories: product.categories
          .map((category) => category.name?.trim() ?? "")
          .filter(Boolean),
        ingredientDeclarations,
        ingredientAmounts,
        formulation,
        formulationKind: formulation ? classifyFormulation(formulation) : null,
        offers: product.pharmacyProducts.map((offer) => ({
          pharmacyProductId: offer.id,
          priceKrw: offer.price ?? -1,
          stockCount: offer.stock ?? -1,
          optionType: offer.optionType,
          capacity: offer.capacity,
        })),
      };
    })
    .filter(
      (
        product
      ): product is typeof product & {
        formulation: string;
        formulationKind: ProductFormulationKind;
      } =>
        product.ingredientDeclarations.length > 0 &&
        nonEmptyString(product.formulation) &&
        product.formulationKind !== null
    );
}

function buildStockSubstitution(
  context: ProductCombinationInventoryContext | null,
  catalog: WbRndProductCatalogItem[],
  currentTop: ReturnType<typeof materializeCombination> | undefined,
  currentCatalogVersion: string,
  searchTruncated: boolean,
  constraints: ProductOptimizationConstraints,
  currentInputSha256: string
) {
  if (context === null) {
    return {
      schema_version: contract.stockSubstitutionContractVersion,
      status: "NOT_REQUESTED",
      previous_catalog_version: null,
      current_catalog_version: currentCatalogVersion,
      previous_combination_id: null,
      current_combination_id: currentTop?.combination_id ?? null,
      missing_pharmacy_product_ids: [],
      safety_constraints_preserved: null,
      optimization_input_unchanged: null,
    };
  }
  const currentOfferIds = new Set(
    catalog.flatMap((product) =>
      product.offers.map((offer) => offer.pharmacyProductId)
    )
  );
  const missingOfferIds = context.previous_selections
    .map((item) => item.pharmacy_product_id)
    .filter((identity) => !currentOfferIds.has(identity))
    .sort((left, right) => left - right);
  let status:
    | "UNCHANGED"
    | "SUBSTITUTED"
    | "UNAVAILABLE"
    | "SEARCH_TRUNCATED"
    | "CATALOG_CHANGED"
    | "SAFETY_POLICY_CHANGED"
    | "OPTIMIZATION_INPUT_CHANGED";
  const safetyConstraintsPreserved =
    JSON.stringify(context.previous_safety_constraints.excluded_ingredient_keys) ===
      JSON.stringify(constraints.excludedRndIngredientKeys) &&
    JSON.stringify(context.previous_safety_constraints.safety_rule_ids) ===
      JSON.stringify(constraints.safetyRuleIds);
  const optimizationInputUnchanged =
    context.previous_replay_identity.input_sha256 === currentInputSha256;
  if (!safetyConstraintsPreserved) {
    status = "SAFETY_POLICY_CHANGED";
  } else if (!optimizationInputUnchanged) {
    status = "OPTIMIZATION_INPUT_CHANGED";
  } else if (searchTruncated) {
    status = "SEARCH_TRUNCATED";
  } else if (!currentTop) {
    status = "UNAVAILABLE";
  } else if (missingOfferIds.length > 0) {
    status = "SUBSTITUTED";
  } else if (currentTop.combination_id === context.previous_combination_id) {
    status = "UNCHANGED";
  } else {
    status = "CATALOG_CHANGED";
  }
  return {
    schema_version: contract.stockSubstitutionContractVersion,
    status,
    previous_catalog_version: context.previous_catalog_version,
    current_catalog_version: currentCatalogVersion,
    previous_combination_id: context.previous_combination_id,
    current_combination_id: currentTop?.combination_id ?? null,
    missing_pharmacy_product_ids: missingOfferIds,
    safety_constraints_preserved:
      status === "SAFETY_POLICY_CHANGED" ? false : status === "SUBSTITUTED" ? true : null,
    optimization_input_unchanged: optimizationInputUnchanged,
  };
}

function buildCartCandidate(
  currentTop: ReturnType<typeof materializeCombination> | undefined,
  searchTruncated: boolean,
  substitutionBlockReason:
    | "SAFETY_CONSTRAINTS_CHANGED"
    | "OPTIMIZATION_INPUT_CHANGED"
    | null
) {
  const missingOptionType = currentTop?.selected_products.some(
    (product) => !nonEmptyString(product.offer.option_type)
  );
  const ready =
    Boolean(currentTop) &&
    !searchTruncated &&
    substitutionBlockReason === null &&
    !missingOptionType;
  return {
    schema_version: contract.cartCandidateContractVersion,
    status: ready ? "READY" : "UNAVAILABLE",
    unavailable_reason: searchTruncated
      ? "SEARCH_TRUNCATED"
      : substitutionBlockReason !== null
        ? substitutionBlockReason
      : !currentTop
        ? "NO_ELIGIBLE_COMBINATION"
        : missingOptionType
          ? "OPTION_TYPE_MISSING"
          : null,
    source_combination_id: ready ? currentTop?.combination_id : null,
    items: ready
      ? currentTop?.selected_products.map((product) => ({
          productId: product.product_id,
          productName: product.product_name,
          optionType: product.offer.option_type as string,
          quantity: 1,
        }))
      : [],
    approval_required: true,
    approval_status: "NOT_APPROVED",
    cart_storage_written: false,
    order_created: false,
    order_id: null,
  };
}

export function attachWbRndProductCandidates(
  value: JsonRecord,
  rawCatalog: unknown,
  inventoryContext: ProductCombinationInventoryContext | null = null
) {
  if (!Array.isArray(value.recommendations)) {
    throw new Error("WB_RND_PRODUCT_MATCH_invalid_recommendations");
  }
  const optimizationConstraints = validateProductOptimizationConstraints(
    value.product_optimization_constraints
  );
  if (
    value.recommendations.some(
      (item) =>
        isRecord(item) &&
        nonEmptyString(item.ingredient) &&
        optimizationConstraints.excludedRndIngredientKeys.includes(item.ingredient)
    )
  ) {
    throw new Error("WB_RND_PRODUCT_MATCH_excluded_recommendation_reentered");
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
  const combinationResult = buildProductCombinations(
    recommendations as Array<JsonRecord & { product_candidates: ProductCandidate[] }>,
    optimizationConstraints
  );
  const productCombinations = combinationResult.combinations;
  const catalogVersionValue = catalogVersion(catalog);
  const optimizationInput = canonicalRecommendationInput(
    recommendations as JsonRecord[],
    optimizationConstraints
  );
  const inputSha256 = canonicalSha256(optimizationInput);
  const ranking = rankProductCombinations(
    combinationResult,
    optimizationConstraints,
    inputSha256,
    catalogVersionValue
  );
  const currentTopIdentity = ranking.topK[0]?.combination_id;
  const currentTop = combinationResult.evaluatedCombinations.find(
    (item) => item.combination_id === currentTopIdentity
  );
  const factCompleteRecommendationCount = recommendations.filter((item) =>
    item.product_candidates.some(
      (product) =>
        product.ingredients.length > 0 &&
        product.ingredient_declarations.length > 0 &&
        nonEmptyString(product.formulation) &&
        product.offers.length > 0
    )
  ).length;
  const stockSubstitution = buildStockSubstitution(
    inventoryContext,
    catalog,
    currentTop,
    catalogVersionValue,
    combinationResult.searchTruncated,
    optimizationConstraints,
    inputSha256
  );
  return {
    ...value,
    recommendations,
    product_combinations: productCombinations,
    product_combination_top_k: ranking.topK,
    product_combination_non_selection: ranking.nonSelection,
    product_combination_replay: {
      schema_version: "product_combination_replay_identity_v1",
      input_sha256: inputSha256,
      catalog_version: catalogVersionValue,
      catalog_version_contract: contract.catalogVersionContractVersion,
      result_sha256: ranking.resultSha256,
      optimization_input: optimizationInput,
    },
    product_combination_stock_substitution: stockSubstitution,
    product_combination_cart_candidate: buildCartCandidate(
      currentTop,
      combinationResult.searchTruncated,
      stockSubstitution.safety_constraints_preserved === false
        ? "SAFETY_CONSTRAINTS_CHANGED"
        : stockSubstitution.optimization_input_unchanged === false
          ? "OPTIMIZATION_INPUT_CHANGED"
          : null
    ),
    product_combination_resolution: {
      schema_version: contract.combinationContractVersion,
      filter_schema_version: contract.combinationFilterContractVersion,
      combination_count: productCombinations.length,
      pre_filter_combination_count: combinationResult.preFilterCombinationCount,
      budget_excluded_count: combinationResult.budgetExcludedCount,
      product_count_excluded_count: combinationResult.productCountExcludedCount,
      safety_excluded_count: combinationResult.safetyExcludedCount,
      search_state_count: combinationResult.searchStateCount,
      search_truncated: combinationResult.searchTruncated,
      combination_limit_reached: combinationResult.combinationLimitReached,
      complete:
        recommendations.length > 0 &&
        productCombinations.length > 0 &&
        productCombinations.every(
          (item) =>
            item.recommendation_service_ingredient_ids.length ===
            recommendations.length
        ),
    },
    product_candidate_resolution: {
      schema_version: contract.schemaVersion,
      mapping_version: contract.mappingVersion,
      ingredient_mapping_version: contract.ingredientMappingVersion,
      product_catalog_source: contract.productCatalogSource,
      catalog_product_count: catalog.length,
      catalog_contract_version: contract.catalogContractVersion,
      complete_fact_product_count: catalog.filter(
        (product) =>
          product.ingredientDeclarations.length > 0 &&
          nonEmptyString(product.formulation) &&
          product.offers.length > 0
      ).length,
      recommendation_count: recommendations.length,
      matched_recommendation_count: matchedRecommendationCount,
      fact_complete_recommendation_count: factCompleteRecommendationCount,
      complete:
        matchedRecommendationCount === recommendations.length &&
        factCompleteRecommendationCount === recommendations.length,
    },
  };
}

export const WB_RND_PRODUCT_CANDIDATE_MAPPING_VERSION = contract.mappingVersion;
