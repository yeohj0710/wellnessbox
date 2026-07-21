import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { POST as postTipsRecommendation } from "../../app/api/tips/route";
import { type callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import type { WbRndRecommendationRouteDependencies } from "../../lib/server/wb-rnd-interim-route";
import { setTipsPostTestDependencies } from "../../lib/server/wb-rnd-tips-route-test-hook";
import { buildWbRndProductCatalogIdentityForEvidence } from "../../lib/server/wb-rnd-product-candidates";
import { parseClientCartItems } from "../../lib/client/cart-storage";

process.env.NODE_ENV = "test";
process.env.WB_RND_INTERIM_ENABLED = "1";
process.env.WB_RND_INTERIM_PSEUDONYM_SALT = "op050-product-candidate-salt";

const productContract = JSON.parse(
  readFileSync(
    resolve("contracts/wb-rnd/product-candidate-match-v1.json"),
    "utf8"
  )
) as {
  schema_version: string;
  mapping_version: string;
  ingredient_mapping_version: string;
  combination_contract_version: string;
  optimization_constraints_contract_version: string;
  combination_filter_contract_version: string;
  combination_ranking_contract_version: string;
  catalog_version_contract_version: string;
  inventory_context_contract_version: string;
  stock_substitution_contract_version: string;
  cart_candidate_contract_version: string;
  max_product_combinations: number;
  max_product_combination_search_states: number;
  max_ranked_product_combinations: number;
  mappings: Array<{ service_ingredient_id: string; match_terms: string[] }>;
};
const ingredientContract = JSON.parse(
  readFileSync(
    resolve("contracts/wb-rnd/ingredient-identifier-map-v1.json"),
    "utf8"
  )
) as {
  mapping_version: string;
  mappings: Array<{
    service_ingredient_id: string;
    rnd_ingredient_key: string;
  }>;
};
const catalogSnapshot = JSON.parse(
  readFileSync(
    resolve("contracts/wb-rnd/product-candidate-catalog-snapshot-v1.json"),
    "utf8"
  )
) as {
  schema_version: string;
  captured_on: string;
  source: string;
  production_operation_proven: boolean;
  products: Array<{ id: number; name: string; categories: string[] }>;
};

const readyFixture = {
  run_id: "rec_op050_ready",
  status: "READY",
  mode: "PROXY_GOLD_SIMULATION",
  simulation: true,
  model_id: "op050-route-fixture",
  safety_action: "PASS",
  findings: [],
  recommendations: ingredientContract.mappings.map((mapping, index) => ({
    ingredient: mapping.rnd_ingredient_key,
    rank: index + 1,
    score: 0.91 - index * 0.01,
    evidence_ids: [`EV-OP050-${index + 1}`],
  })),
  product_optimization_constraints: {
    schema_version: "product_optimization_constraints_v1",
    max_total_cost_krw: 1_000_000_000,
    max_products: 20,
    excluded_ingredient_keys: [],
    safety_rule_ids: [],
  },
  uncertainty: "op050 route fixture",
};

const productCatalog = catalogSnapshot.products.map((product, index) => ({
  ...product,
  ingredientDeclarations: [
    {
      label: "기능 성분 함량",
      value: `${product.categories[0]} ${100 + index * 10} mg`,
    },
  ],
  formulation: index % 2 === 0 ? "캡슐" : "정제",
  formulationKind: index % 2 === 0 ? "capsule" : "tablet",
  offers: [
    {
      pharmacyProductId: 10_000 + product.id,
      priceKrw: 10_000 + index * 1_000,
      stockCount: 5 + index,
      optionType: "30일분",
      capacity: "30정",
    },
  ],
}));
const combinationProductCatalog = productCatalog.map((product, index) => ({
  ...product,
  ingredientDeclarations: product.categories.map((category, categoryIndex) => ({
    label: "ingredient amount",
    value: `${category} ${100 + index * 10 + categoryIndex} mg`,
  })),
}));

const sharedCombinationCatalog = [
  ...Array.from({ length: 4 }, (_, index) => ({
    id: 5_000 + index,
    name: productContract.mappings
      .map((mapping) => mapping.match_terms[0])
      .join(" "),
    categories: productContract.mappings.map((mapping) => mapping.match_terms[0]),
    ingredientDeclarations: productContract.mappings.map((mapping) => ({
      label: "ingredient amount",
      value: `${mapping.match_terms[0]} ${100 + index} mg`,
    })),
    formulation: "capsule",
    formulationKind: "capsule",
    offers: [
      {
        pharmacyProductId: 15_000 + index,
        priceKrw: 20_000 + index,
        stockCount: 10,
        optionType: "30 days",
        capacity: "30 tablets",
      },
    ],
  })),
  ...productContract.mappings.map((mapping, index) => ({
    id: 6_000 + index,
    name: mapping.match_terms[0],
    categories: [mapping.match_terms[0]],
    ingredientDeclarations: [
      {
        label: "ingredient amount",
        value: `${mapping.match_terms[0]} ${200 + index} mg`,
      },
    ],
    formulation: "tablet",
    formulationKind: "tablet",
    offers: [
      {
        pharmacyProductId: 16_000 + index,
        priceKrw: 30_000 + index,
        stockCount: 10,
        optionType: null,
        capacity: null,
      },
    ],
  })),
];

const expectedPrimaryProductIdByServiceIngredient = {
  "ING:CALCIUM": 29,
  "ING:COQ10": 44,
  "ING:MAGNESIUM": 29,
  "ING:OMEGA3": 31,
  "ING:PROBIOTIC": 35,
  "ING:VITAMIN_C": 30,
  "ING:VITAMIN_D": 29,
  "ING:ZINC": 29,
} as const;

async function routeWithCatalog(
  catalog: unknown,
  upstream: unknown = readyFixture,
  requestBody: Record<string, unknown> = { goals: ["sleep_support"] },
  upstreamCapture?: { payload?: unknown }
) {
  const requireUserSessionImpl = (async () => ({
    ok: true,
    data: { appUserId: "op050-user" },
  })) as WbRndRecommendationRouteDependencies["requireUserSessionImpl"];
  const callWbRndInterimImpl = (async (
    _path: string,
    _method: string,
    payload: unknown
  ) => {
    if (upstreamCapture) upstreamCapture.payload = payload;
    return upstream;
  }) as typeof callWbRndInterim;
  const listProductCatalogImpl = (async () =>
    catalog) as unknown as WbRndRecommendationRouteDependencies["listProductCatalogImpl"];
  const request = new Request("http://wellnessbox.local/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  setTipsPostTestDependencies(request, {
    requireUserSessionImpl,
    callWbRndInterimImpl,
    listProductCatalogImpl,
  });
  return postTipsRecommendation(request);
}

async function run() {
  assert.equal(
    productContract.schema_version,
    "wb_rnd_product_candidate_match_v1"
  );
  assert.equal(
    catalogSnapshot.schema_version,
    "wb_rnd_product_catalog_snapshot_v1"
  );
  assert.equal(catalogSnapshot.production_operation_proven, false);
  assert.ok(productContract.mapping_version);
  assert.equal(
    productContract.ingredient_mapping_version,
    ingredientContract.mapping_version
  );
  assert.deepEqual(
    new Set(productContract.mappings.map((item) => item.service_ingredient_id)),
    new Set(
      ingredientContract.mappings.map((item) => item.service_ingredient_id)
    )
  );
  assert.ok(
    productContract.mappings.every(
      (item) =>
        item.match_terms.length > 0 &&
        new Set(item.match_terms.map((term) => term.trim().toLowerCase()))
          .size === item.match_terms.length
    )
  );

  const matchedResponse = await routeWithCatalog(combinationProductCatalog);
  const matched = (await matchedResponse.json()) as {
    status?: string;
    recommendations?: Array<{
      service_ingredient_id?: string;
      product_candidate_status?: string;
      product_candidates?: Array<{
        product_id?: number;
        match_basis?: string;
        ingredients?: string[];
        ingredient_declarations?: Array<{ label?: string; value?: string }>;
        ingredient_amounts?: Array<{
          service_ingredient_id?: string;
          normalized_amount?: number;
          normalized_unit?: "ng" | "milli_IU";
          source_label?: string;
          source_value?: string;
        }>;
        formulation?: string | null;
        formulation_kind?: string;
        offers?: Array<{
          pharmacy_product_id?: number;
          price_krw?: number;
          stock_count?: number;
        }>;
      }>;
    }>;
    product_candidate_resolution?: {
      mapping_version?: string;
      ingredient_mapping_version?: string;
      complete?: boolean;
      matched_recommendation_count?: number;
      catalog_contract_version?: string;
      complete_fact_product_count?: number;
      fact_complete_recommendation_count?: number;
    };
    product_combinations?: Array<{
      schema_version?: string;
      combination_id?: string;
      recommendation_service_ingredient_ids?: string[];
      selected_products?: Array<{
        product_id?: number;
        offer?: { pharmacy_product_id?: number; price_krw?: number };
        ingredient_amounts?: Array<{
          service_ingredient_id?: string;
          normalized_amount?: number;
      normalized_unit?: "ng" | "milli_IU";
        }>;
      }>;
      product_count?: number;
      total_cost_krw?: number;
      ingredient_totals?: Array<{
        service_ingredient_id?: string;
        total_declared_amount?: number;
        unit?: string;
        product_ids?: number[];
        duplicate_across_products?: boolean;
      }>;
      duplicate_ingredient_ids?: string[];
    }>;
    product_combination_resolution?: {
      schema_version?: string;
      filter_schema_version?: string;
      combination_count?: number;
      pre_filter_combination_count?: number;
      budget_excluded_count?: number;
      product_count_excluded_count?: number;
      safety_excluded_count?: number;
      complete?: boolean;
      search_state_count?: number;
      search_truncated?: boolean;
      combination_limit_reached?: boolean;
    };
    product_combination_top_k?: Array<{
      rank?: number;
      combination_id?: string;
      ranking_tuple?: [number, number, string];
    }>;
    product_combination_non_selection?: Array<{
      combination_id?: string;
      reason_codes?: string[];
    }>;
    product_combination_replay?: {
      schema_version?: string;
      input_sha256?: string;
      catalog_version?: string;
      result_sha256?: string;
    };
    product_combination_stock_substitution?: {
      schema_version?: string;
      status?: string;
      previous_catalog_version?: string | null;
      current_catalog_version?: string;
      previous_combination_id?: string | null;
      current_combination_id?: string | null;
      missing_pharmacy_product_ids?: number[];
      safety_constraints_preserved?: boolean | null;
    };
    product_combination_cart_candidate?: {
      schema_version?: string;
      status?: string;
      unavailable_reason?: string | null;
      source_combination_id?: string | null;
      items?: Array<{
        productId: number;
        productName: string;
        optionType: string;
        quantity: number;
      }>;
      approval_required?: boolean;
      approval_status?: string;
      cart_storage_written?: boolean;
      order_created?: boolean;
      order_id?: number | null;
    };
  };
  assert.equal(matchedResponse.status, 200);
  assert.equal(matched.status, "READY");
  assert.deepEqual(
    matched.recommendations?.map((item) => item.service_ingredient_id),
    ingredientContract.mappings.map((item) => item.service_ingredient_id)
  );
  assert.deepEqual(
    matched.recommendations?.map(
      (item) => item.product_candidates?.[0]?.product_id
    ),
    ingredientContract.mappings.map(
      (item) =>
        expectedPrimaryProductIdByServiceIngredient[
          item.service_ingredient_id as keyof typeof expectedPrimaryProductIdByServiceIngredient
        ]
    )
  );
  assert.ok(
    matched.recommendations
      ?.find((item) => item.service_ingredient_id === "ING:VITAMIN_D")
      ?.product_candidates?.some((item) => item.product_id === 33)
  );
  assert.ok(
    matched.recommendations?.every(
      (item) =>
        item.product_candidate_status === "MATCHED" &&
        item.product_candidates?.[0]?.match_basis === "product_name"
    )
  );
  assert.equal(matched.product_candidate_resolution?.complete, true);
  assert.equal(
    productContract.combination_contract_version,
    "wb_rnd_product_combination_v1"
  );
  assert.equal(productContract.max_product_combinations, 64);
  assert.equal(productContract.max_product_combination_search_states, 4096);
  assert.equal(
    productContract.optimization_constraints_contract_version,
    "product_optimization_constraints_v1"
  );
  assert.equal(
    productContract.combination_filter_contract_version,
    "product_combination_filter_v1"
  );
  assert.equal(
    productContract.combination_ranking_contract_version,
    "product_combination_ranking_v1"
  );
  assert.equal(
    productContract.catalog_version_contract_version,
    "product_catalog_content_sha256_v1"
  );
  assert.equal(productContract.max_ranked_product_combinations, 3);
  assert.equal(
    productContract.inventory_context_contract_version,
    "product_combination_inventory_context_v1"
  );
  assert.equal(
    productContract.stock_substitution_contract_version,
    "product_combination_stock_substitution_v1"
  );
  assert.equal(
    productContract.cart_candidate_contract_version,
    "product_combination_cart_candidate_v1"
  );
  assert.equal(
    matched.product_candidate_resolution?.catalog_contract_version,
    "wb_rnd_selling_product_catalog_v1"
  );
  assert.equal(
    matched.product_candidate_resolution?.complete_fact_product_count,
    productCatalog.length
  );
  assert.equal(
    matched.product_candidate_resolution?.fact_complete_recommendation_count,
    ingredientContract.mappings.length
  );
  assert.ok(
    matched.recommendations?.every((item) => {
      const candidate = item.product_candidates?.[0];
      return (
        (candidate?.ingredients?.length ?? 0) > 0 &&
        (candidate?.ingredient_declarations?.length ?? 0) > 0 &&
        Boolean(candidate?.formulation) &&
        ["capsule", "tablet"].includes(candidate?.formulation_kind ?? "") &&
        (candidate?.offers?.length ?? 0) > 0 &&
        Number(candidate?.offers?.[0]?.price_krw) >= 0 &&
        Number(candidate?.offers?.[0]?.stock_count) > 0
      );
    })
  );
  assert.equal(
    matched.product_candidate_resolution?.ingredient_mapping_version,
    ingredientContract.mapping_version
  );
  assert.equal(
    matched.product_candidate_resolution?.matched_recommendation_count,
    ingredientContract.mappings.length
  );
  assert.equal(
    matched.product_combination_resolution?.schema_version,
    "wb_rnd_product_combination_v1"
  );
  assert.equal(matched.product_combination_resolution?.complete, true);
  assert.equal(
    matched.product_combination_resolution?.filter_schema_version,
    "product_combination_filter_v1"
  );
  assert.equal(
    matched.product_combination_resolution?.pre_filter_combination_count,
    matched.product_combination_resolution?.combination_count
  );
  assert.equal(matched.product_combination_resolution?.budget_excluded_count, 0);
  assert.equal(
    matched.product_combination_resolution?.product_count_excluded_count,
    0
  );
  assert.equal(matched.product_combination_resolution?.safety_excluded_count, 0);
  assert.ok((matched.product_combinations?.length ?? 0) > 0);
  assert.ok(
    (matched.product_combinations?.length ?? 0) <=
      productContract.max_product_combinations
  );
  const sharedProductCombination = matched.product_combinations?.find(
    (item) =>
      JSON.stringify(item.selected_products?.map((product) => product.product_id)) ===
      JSON.stringify([29, 30, 31, 35, 44])
  );
  assert.ok(sharedProductCombination);
  assert.equal(sharedProductCombination?.product_count, 5);
  assert.equal(
    sharedProductCombination?.recommendation_service_ingredient_ids?.length,
    ingredientContract.mappings.length
  );
  assert.deepEqual(sharedProductCombination?.duplicate_ingredient_ids, []);
  assert.deepEqual(
    sharedProductCombination?.ingredient_totals?.find(
      (item) => item.service_ingredient_id === "ING:MAGNESIUM"
    ),
    {
      service_ingredient_id: "ING:MAGNESIUM",
      total_declared_amount: 102_000_000,
      unit: "ng",
      product_ids: [29],
      duplicate_across_products: false,
    }
  );
  assert.equal(
    sharedProductCombination?.total_cost_krw,
    sharedProductCombination?.selected_products?.reduce(
      (total, item) => total + Number(item.offer?.price_krw),
      0
    )
  );
  assert.match(
    sharedProductCombination?.combination_id ?? "",
    /^combo_[a-f0-9]{16}$/
  );
  const duplicateZincCombination = matched.product_combinations?.find((item) =>
    item.duplicate_ingredient_ids?.includes("ING:ZINC")
  );
  assert.ok(duplicateZincCombination);
  assert.deepEqual(
    duplicateZincCombination?.ingredient_totals?.find(
      (item) => item.service_ingredient_id === "ING:ZINC"
    ),
    {
      service_ingredient_id: "ING:ZINC",
      total_declared_amount: 253_000_000,
      unit: "ng",
      product_ids: [29, 42],
      duplicate_across_products: true,
    }
  );
  assert.deepEqual(
    matched.product_combination_top_k?.map((item) => item.rank),
    [1, 2, 3]
  );
  assert.ok(
    matched.product_combination_non_selection?.every(
      (item) =>
        (item.reason_codes?.length ?? 0) > 0 &&
        item.reason_codes?.every((reason) => reason !== "LOWER_RANKED")
    )
  );
  assert.match(
    matched.product_combination_replay?.catalog_version ?? "",
    /^catalog_[a-f0-9]{64}$/
  );
  assert.match(
    matched.product_combination_replay?.input_sha256 ?? "",
    /^[a-f0-9]{64}$/
  );
  assert.match(
    matched.product_combination_replay?.result_sha256 ?? "",
    /^[a-f0-9]{64}$/
  );
  assert.equal(
    matched.product_combination_stock_substitution?.status,
    "NOT_REQUESTED"
  );
  assert.equal(matched.product_combination_cart_candidate?.status, "READY");
  assert.equal(
    matched.product_combination_cart_candidate?.source_combination_id,
    matched.product_combination_top_k?.[0]?.combination_id
  );
  assert.deepEqual(
    parseClientCartItems(matched.product_combination_cart_candidate?.items),
    matched.product_combination_cart_candidate?.items
  );
  assert.equal(matched.product_combination_cart_candidate?.approval_required, true);
  assert.equal(
    matched.product_combination_cart_candidate?.approval_status,
    "NOT_APPROVED"
  );
  assert.equal(
    matched.product_combination_cart_candidate?.cart_storage_written,
    false
  );
  assert.equal(matched.product_combination_cart_candidate?.order_created, false);
  assert.equal(matched.product_combination_cart_candidate?.order_id, null);
  const repeatedResponse = await routeWithCatalog(combinationProductCatalog);
  const repeated = (await repeatedResponse.json()) as typeof matched;
  const reorderedResponse = await routeWithCatalog(
    [...combinationProductCatalog].reverse()
  );
  const reordered = (await reorderedResponse.json()) as typeof matched;
  assert.deepEqual(
    repeated.product_combination_top_k,
    matched.product_combination_top_k
  );
  assert.deepEqual(
    repeated.product_combination_non_selection,
    matched.product_combination_non_selection
  );
  assert.equal(
    reordered.product_combination_replay?.catalog_version,
    matched.product_combination_replay?.catalog_version
  );
  assert.equal(
    reordered.product_combination_replay?.result_sha256,
    matched.product_combination_replay?.result_sha256
  );
  const optionChangedCatalog = combinationProductCatalog.map((product, index) =>
    index === 0
      ? {
          ...product,
          offers: product.offers.map((offer) => ({
            ...offer,
            optionType: `${offer.optionType}-changed`,
            capacity: `${offer.capacity}-changed`,
          })),
        }
      : product
  );
  const optionChangedResponse = await routeWithCatalog(optionChangedCatalog);
  const optionChanged = (await optionChangedResponse.json()) as typeof matched;
  assert.notEqual(
    optionChanged.product_combination_replay?.catalog_version,
    matched.product_combination_replay?.catalog_version
  );
  const duplicateOfferCatalog = combinationProductCatalog.map((product, index) =>
    index === 1
      ? {
          ...product,
          offers: product.offers.map((offer) => ({
            ...offer,
            pharmacyProductId: combinationProductCatalog[0].offers[0].pharmacyProductId,
          })),
        }
      : product
  );
  assert.equal((await routeWithCatalog(duplicateOfferCatalog)).status, 502);

  const globalRankingMappings = productContract.mappings.slice(0, 3);
  const globalRankingCatalog = globalRankingMappings.flatMap((mapping, mappingIndex) =>
    Array.from({ length: 5 }, (_, candidateIndex) => ({
      id: 20_000 + mappingIndex * 10 + candidateIndex,
      name: `${mapping.match_terms[0]} ${candidateIndex}`,
      categories: [mapping.match_terms[0]],
      ingredientDeclarations: [{
        label: "ingredient amount",
        value: `${mapping.match_terms[0]} ${100 + candidateIndex} mg`,
      }],
      formulation: "tablet",
      formulationKind: "tablet",
      offers: [{
        pharmacyProductId: 30_000 + mappingIndex * 10 + candidateIndex,
        priceKrw: candidateIndex === 4 ? 1_000 : 10_000 + candidateIndex,
        stockCount: 10,
        optionType: "30 days",
        capacity: "30 tablets",
      }],
    }))
  );
  const globalRankingResponse = await routeWithCatalog(globalRankingCatalog, {
    ...readyFixture,
    recommendations: readyFixture.recommendations.slice(0, 3),
  });
  const globalRanking = (await globalRankingResponse.json()) as typeof matched;
  assert.equal(globalRankingResponse.status, 200);
  assert.equal(globalRanking.product_combination_top_k?.[0]?.ranking_tuple?.[0], 3_000);
  assert.equal(globalRanking.product_combination_resolution?.search_truncated, false);
  assert.equal(globalRanking.product_combination_resolution?.combination_limit_reached, true);
  const stockBaselineCatalog = globalRankingCatalog.filter(
    (product) => product.id % 10 === 0 || product.id % 10 === 4
  );
  const stockBaselineResponse = await routeWithCatalog(stockBaselineCatalog, {
    ...readyFixture,
    recommendations: readyFixture.recommendations.slice(0, 3),
  });
  const stockBaseline = (await stockBaselineResponse.json()) as typeof matched;
  assert.equal(stockBaselineResponse.status, 200);
  assert.equal(stockBaseline.product_combinations?.length, 8);
  const previousTopIdentity = stockBaseline.product_combination_top_k?.[0]
    ?.combination_id;
  const previousTop = stockBaseline.product_combinations?.find(
    (item) => item.combination_id === previousTopIdentity
  );
  assert.ok(previousTop);
  const previousSelections = previousTop?.selected_products?.map((product) => ({
    product_id: Number(product.product_id),
    pharmacy_product_id: Number(product.offer?.pharmacy_product_id),
  }));
  assert.equal(previousSelections?.length, 3);
  const removedOfferId = previousSelections?.[0]?.pharmacy_product_id;
  const stockChangedCatalog = stockBaselineCatalog.filter(
    (product) => product.offers[0].pharmacyProductId !== removedOfferId
  );
  const upstreamCapture: { payload?: unknown } = {};
  const inventoryContext = {
    schema_version: productContract.inventory_context_contract_version,
    previous_catalog_version:
      stockBaseline.product_combination_replay?.catalog_version,
    previous_combination_id: previousTopIdentity,
    previous_selections: previousSelections,
  };
  const substitutedResponse = await routeWithCatalog(
    stockChangedCatalog,
    {
      ...readyFixture,
      recommendations: readyFixture.recommendations.slice(0, 3),
    },
    {
      goals: ["sleep_support"],
      product_combination_context: inventoryContext,
    },
    upstreamCapture
  );
  const substituted = (await substitutedResponse.json()) as typeof matched;
  assert.equal(substitutedResponse.status, 200);
  assert.equal(
    substituted.product_combination_stock_substitution?.status,
    "SUBSTITUTED"
  );
  assert.equal(
    substituted.product_combination_stock_substitution?.previous_combination_id,
    previousTopIdentity
  );
  assert.notEqual(
    substituted.product_combination_stock_substitution?.current_combination_id,
    previousTopIdentity
  );
  assert.deepEqual(
    substituted.product_combination_stock_substitution
      ?.missing_pharmacy_product_ids,
    [removedOfferId]
  );
  assert.equal(
    substituted.product_combination_stock_substitution
      ?.safety_constraints_preserved,
    true
  );
  assert.equal(
    JSON.stringify(upstreamCapture.payload).includes(
      "product_combination_context"
    ),
    false
  );
  assert.equal(substituted.product_combination_cart_candidate?.status, "READY");
  assert.deepEqual(
    parseClientCartItems(substituted.product_combination_cart_candidate?.items),
    substituted.product_combination_cart_candidate?.items
  );
  assert.equal(substituted.product_combination_cart_candidate?.order_created, false);
  assert.equal(substituted.product_combination_cart_candidate?.order_id, null);
  assert.ok(
    substituted.product_combinations?.every((combination) =>
      combination.selected_products?.every(
        (product) => product.offer?.pharmacy_product_id !== removedOfferId
      )
    )
  );
  const invalidContextResponse = await routeWithCatalog(
    stockChangedCatalog,
    readyFixture,
    {
      product_combination_context: { ...inventoryContext, unexpected: true },
    }
  );
  assert.equal(invalidContextResponse.status, 502);
  const routeSource = readFileSync(
    resolve("lib/server/wb-rnd-interim-route.ts"),
    "utf8"
  );
  const productAdapterSource = readFileSync(
    resolve("lib/server/wb-rnd-product-candidates.ts"),
    "utf8"
  );
  for (const source of [routeSource, productAdapterSource]) {
    assert.doesNotMatch(source, /prisma\.(?:order|orderItem)\.(?:create|update)/i);
    assert.doesNotMatch(source, /createOrder|createOrderItem/);
  }

  const constrainedPolicy = {
    schema_version: "product_optimization_constraints_v1",
    max_total_cost_krw: 65_000,
    max_products: 5,
    excluded_ingredient_keys: [] as string[],
    safety_rule_ids: [] as string[],
  };
  const constrainedResponse = await routeWithCatalog(combinationProductCatalog, {
    ...readyFixture,
    product_optimization_constraints: constrainedPolicy,
  });
  const constrained = (await constrainedResponse.json()) as {
    product_combinations?: Array<{
      total_cost_krw?: number;
      product_count?: number;
    }>;
    product_combination_resolution?: {
      combination_count?: number;
      pre_filter_combination_count?: number;
      budget_excluded_count?: number;
      product_count_excluded_count?: number;
      safety_excluded_count?: number;
    };
    product_combination_non_selection?: Array<{
      combination_id?: string;
      reason_codes?: string[];
    }>;
  };
  assert.equal(constrainedResponse.status, 200);
  assert.ok((constrained.product_combinations?.length ?? 0) > 0);
  assert.ok(
    constrained.product_combinations?.every(
      (item) => Number(item.total_cost_krw) <= 65_000 && Number(item.product_count) <= 5
    )
  );
  assert.ok(
    Number(constrained.product_combination_resolution?.pre_filter_combination_count) >
      Number(constrained.product_combination_resolution?.combination_count)
  );
  assert.ok(
    Number(constrained.product_combination_resolution?.budget_excluded_count) > 0
  );
  assert.ok(
    Number(constrained.product_combination_resolution?.product_count_excluded_count) > 0
  );
  assert.equal(
    constrained.product_combination_resolution?.safety_excluded_count,
    0
  );
  assert.ok(
    constrained.product_combination_non_selection?.some(
      (item) =>
        item.reason_codes?.includes("OVER_BUDGET") &&
        item.reason_codes?.includes("OVER_MAX_PRODUCTS")
    )
  );

  const safetyControlFixture = {
    ...readyFixture,
    recommendations: readyFixture.recommendations.filter(
      (item) => item.ingredient === "magnesium_glycinate"
    ),
    product_optimization_constraints: {
      schema_version: "product_optimization_constraints_v1",
      max_total_cost_krw: 100_000,
      max_products: 5,
      excluded_ingredient_keys: [],
      safety_rule_ids: [],
    },
  };
  const safetyControlResponse = await routeWithCatalog(
    combinationProductCatalog,
    safetyControlFixture
  );
  const safetyControl = (await safetyControlResponse.json()) as {
    product_combinations?: unknown[];
  };
  assert.equal(safetyControlResponse.status, 200);
  assert.equal(safetyControl.product_combinations?.length, 1);

  const safetyFilteredResponse = await routeWithCatalog(combinationProductCatalog, {
    ...safetyControlFixture,
    product_optimization_constraints: {
      schema_version: "product_optimization_constraints_v1",
      max_total_cost_krw: 100_000,
      max_products: 5,
      excluded_ingredient_keys: ["zinc"],
      safety_rule_ids: ["SAFE-OP066-TEST"],
    },
  });
  const safetyFiltered = (await safetyFilteredResponse.json()) as {
    product_combinations?: unknown[];
    product_combination_non_selection?: Array<{
      reason_codes?: string[];
    }>;
    product_combination_resolution?: {
      pre_filter_combination_count?: number;
      combination_count?: number;
      safety_excluded_count?: number;
    };
  };
  assert.equal(safetyFilteredResponse.status, 200);
  assert.equal(safetyFiltered.product_combinations?.length, 0);
  assert.ok(
    Number(safetyFiltered.product_combination_resolution?.pre_filter_combination_count) > 0
  );
  assert.equal(safetyFiltered.product_combination_resolution?.combination_count, 0);
  assert.deepEqual(
    safetyFiltered.product_combination_non_selection?.[0]?.reason_codes,
    ["SAFETY_EXCLUDED_INGREDIENT"]
  );
  assert.ok(
    Number(safetyFiltered.product_combination_resolution?.safety_excluded_count) > 0
  );

  const contradictoryResponse = await routeWithCatalog(combinationProductCatalog, {
    ...readyFixture,
    product_optimization_constraints: {
      schema_version: "product_optimization_constraints_v1",
      max_total_cost_krw: 100_000,
      max_products: 6,
      excluded_ingredient_keys: ["magnesium_glycinate"],
      safety_rule_ids: ["SAFE-OP066-TEST"],
    },
  });
  const contradictory = (await contradictoryResponse.json()) as {
    status?: string;
    recommendations?: unknown[];
    safety_authority?: { mode?: string; reason?: string | null };
  };
  assert.equal(contradictoryResponse.status, 502);
  assert.equal(contradictory.status, "BLOCKED");
  assert.deepEqual(contradictory.recommendations, []);
  assert.equal(contradictory.safety_authority?.mode, "service_fail_closed");
  assert.equal(
    contradictory.safety_authority?.reason,
    "WB_RND_PRODUCT_MATCH_excluded_recommendation_reentered"
  );

  const boundedSearchResponse = await routeWithCatalog(sharedCombinationCatalog);
  const boundedSearch = (await boundedSearchResponse.json()) as {
    product_combination_resolution?: {
      combination_count?: number;
      search_state_count?: number;
      search_truncated?: boolean;
      combination_limit_reached?: boolean;
    };
    product_combination_top_k?: unknown[];
    product_combination_non_selection?: Array<{ reason_codes?: string[] }>;
  };
  assert.equal(boundedSearchResponse.status, 200);
  assert.equal(
    boundedSearch.product_combination_resolution?.combination_count,
    productContract.max_product_combinations
  );
  assert.ok(
    Number(boundedSearch.product_combination_resolution?.search_state_count) <=
      productContract.max_product_combination_search_states
  );
  assert.equal(boundedSearch.product_combination_resolution?.search_truncated, true);
  assert.deepEqual(boundedSearch.product_combination_top_k, []);
  assert.ok(
    boundedSearch.product_combination_non_selection?.some((item) =>
      item.reason_codes?.includes("SEARCH_TRUNCATED")
    )
  );
  assert.equal(
    boundedSearch.product_combination_resolution?.combination_limit_reached,
    true
  );

  const fractionalCatalog = combinationProductCatalog.map((product) =>
    product.id === 29
      ? {
          ...product,
          ingredientDeclarations: product.ingredientDeclarations.map((item) =>
            item.value.startsWith(product.categories[1])
              ? { ...item, value: `${product.categories[1]} 12.5 mcg` }
              : item
          ),
        }
      : product
  );
  const fractionalResponse = await routeWithCatalog(fractionalCatalog);
  const fractional = (await fractionalResponse.json()) as typeof matched;
  assert.equal(fractionalResponse.status, 200);
  assert.deepEqual(
    fractional.recommendations
      ?.find((item) => item.service_ingredient_id === "ING:VITAMIN_D")
      ?.product_candidates?.find((item) => item.product_id === 29)
      ?.ingredient_amounts?.find(
        (item) => item.service_ingredient_id === "ING:VITAMIN_D"
      ),
    {
      service_ingredient_id: "ING:VITAMIN_D",
      normalized_amount: 12_500,
      normalized_unit: "ng",
      source_label: "ingredient amount",
      source_value: `${combinationProductCatalog[0].categories[1]} 12.5 mcg`,
    }
  );

  const noMatchResponse = await routeWithCatalog([]);
  const noMatch = (await noMatchResponse.json()) as {
    status?: string;
    recommendations?: Array<{
      product_candidate_status?: string;
      product_candidates?: unknown[];
    }>;
    product_candidate_resolution?: { complete?: boolean };
  };
  assert.equal(noMatchResponse.status, 200);
  assert.equal(noMatch.status, "READY");
  assert.ok(
    noMatch.recommendations?.every(
      (item) =>
        item.product_candidate_status === "NO_MATCH" &&
        item.product_candidates?.length === 0
    )
  );
  assert.equal(noMatch.product_candidate_resolution?.complete, false);

  const invalidCatalogResponse = await routeWithCatalog([
    { id: 5001, name: "duplicate one", categories: [] },
    { id: 5001, name: "duplicate two", categories: [] },
  ]);
  const invalidCatalog = (await invalidCatalogResponse.json()) as {
    status?: string;
    recommendations?: unknown[];
    safety_authority?: { mode?: string; reason?: string | null };
  };
  assert.equal(invalidCatalogResponse.status, 502);
  assert.equal(invalidCatalog.status, "BLOCKED");
  assert.deepEqual(invalidCatalog.recommendations, []);
  assert.equal(invalidCatalog.safety_authority?.mode, "service_fail_closed");
  assert.equal(
    invalidCatalog.safety_authority?.reason,
    "WB_RND_PRODUCT_MATCH_invalid_catalog"
  );

  const invalidOfferResponse = await routeWithCatalog([
    {
      ...productCatalog[0],
      offers: [{ ...productCatalog[0].offers[0], stockCount: 0 }],
    },
  ]);
  const invalidOffer = (await invalidOfferResponse.json()) as {
    status?: string;
    safety_authority?: { reason?: string | null };
  };
  assert.equal(invalidOfferResponse.status, 502);
  assert.equal(invalidOffer.status, "BLOCKED");
  assert.equal(
    invalidOffer.safety_authority?.reason,
    "WB_RND_PRODUCT_MATCH_invalid_catalog"
  );

  const invalidFactsResponse = await routeWithCatalog([
    {
      ...productCatalog[0],
      ingredientDeclarations: [{ label: "설명", value: "많이 들어 있음" }],
      formulation: "",
      formulationKind: "other",
    },
  ]);
  const invalidFacts = (await invalidFactsResponse.json()) as {
    status?: string;
    safety_authority?: { reason?: string | null };
  };
  assert.equal(invalidFactsResponse.status, 502);
  assert.equal(invalidFacts.status, "BLOCKED");
  assert.equal(
    invalidFacts.safety_authority?.reason,
    "WB_RND_PRODUCT_MATCH_invalid_catalog"
  );

  const ambiguousAmountResponse = await routeWithCatalog([
    {
      ...combinationProductCatalog[0],
      ingredientDeclarations: [
        {
          label: "ingredient amount",
          value: `${combinationProductCatalog[0].categories[0]} 100-200 mg`,
        },
      ],
    },
  ]);
  const ambiguousAmount = (await ambiguousAmountResponse.json()) as {
    status?: string;
    safety_authority?: { reason?: string | null };
  };
  assert.equal(ambiguousAmountResponse.status, 502);
  assert.equal(ambiguousAmount.status, "BLOCKED");
  assert.equal(
    ambiguousAmount.safety_authority?.reason,
    "WB_RND_PRODUCT_MATCH_ambiguous_ingredient_amount"
  );

  const missingMatchedAmountResponse = await routeWithCatalog([
    {
      ...combinationProductCatalog[0],
      ingredientDeclarations: [combinationProductCatalog[0].ingredientDeclarations[0]],
    },
  ]);
  const missingMatchedAmount = (await missingMatchedAmountResponse.json()) as {
    recommendations?: Array<{
      service_ingredient_id?: string;
      product_candidate_status?: string;
    }>;
  };
  assert.equal(missingMatchedAmountResponse.status, 200);
  assert.equal(
    missingMatchedAmount.recommendations?.find(
      (item) => item.service_ingredient_id === "ING:MAGNESIUM"
    )?.product_candidate_status,
    "NO_MATCH"
  );

  const report = {
    ok: true,
    schema_version: "op067_op068_service_product_combination_ranking_contract_v1",
    checks: [
      "product_match_contract_covers_every_mapped_service_ingredient",
      "api_tips_maps_rnd_ingredients_to_service_ingredients",
      "mapped_service_ingredients_resolve_to_catalog_fixture_product_ids",
      "no_match_is_explicit_and_does_not_invent_product_ids",
      "invalid_product_catalog_fails_closed",
      "selling_product_facts_include_ingredients_amount_price_stock_and_formulation",
      "invalid_selling_offer_fails_closed",
      "missing_or_non_amount_product_facts_fail_closed",
      "actual_product_candidates_form_deterministic_combinations",
      "same_product_is_deduplicated_across_recommendations",
      "ingredient_amounts_are_normalized_and_summed_by_product",
      "duplicate_ingredients_require_multiple_distinct_products",
      "ambiguous_amounts_fail_closed",
      "name_match_without_target_ingredient_amount_is_not_a_candidate",
      "shared_candidate_search_is_memoized_and_bounded",
      "fractional_micrograms_use_exact_integer_nanograms",
      "budget_and_product_count_limits_filter_materialized_combinations",
      "safety_excluded_product_ingredient_cannot_reenter",
      "safety_excluded_recommendation_fails_closed",
      "top_k_uses_explicit_deterministic_ranking_tuple",
      "every_evaluated_non_selected_combination_has_reason_codes",
      "same_input_and_catalog_content_reproduce_same_result",
      "catalog_version_is_independent_of_catalog_row_order",
      "catalog_version_covers_offer_option_and_capacity",
      "duplicate_offer_identity_fails_closed",
      "top_k_ranks_all_eligible_combinations_before_output_limit",
      "truncated_search_fails_closed_without_top_k",
      "stock_change_recomputes_safe_substitute_with_existing_optimizer",
      "inventory_context_is_not_forwarded_to_rnd",
      "rank_one_combination_is_existing_cart_contract_compatible",
      "cart_candidate_requires_approval_and_creates_no_order",
    ],
    observed: {
      service_route: "POST /api/tips",
      product_candidate_mapping_version:
        matched.product_candidate_resolution?.mapping_version,
      catalog_fixture_source: `${catalogSnapshot.source}; captured ${catalogSnapshot.captured_on}`,
      production_operation_proven: catalogSnapshot.production_operation_proven,
      mapping_coverage_count: matched.recommendations?.length,
      unmatched_service_ingredient_ids:
        matched.recommendations
          ?.filter((item) => item.product_candidate_status !== "MATCHED")
          .map((item) => item.service_ingredient_id) ?? [],
      service_ingredient_ids: matched.recommendations?.map(
        (item) => item.service_ingredient_id
      ),
      product_ids: matched.recommendations?.map(
        (item) => item.product_candidates?.[0]?.product_id
      ),
      no_match_complete: noMatch.product_candidate_resolution?.complete,
      invalid_catalog_http_status: invalidCatalogResponse.status,
      invalid_offer_http_status: invalidOfferResponse.status,
      invalid_facts_http_status: invalidFactsResponse.status,
      ambiguous_amount_http_status: ambiguousAmountResponse.status,
      missing_matched_amount_http_status: missingMatchedAmountResponse.status,
      bounded_search_state_count:
        boundedSearch.product_combination_resolution?.search_state_count,
      bounded_search_combination_count:
        boundedSearch.product_combination_resolution?.combination_count,
      bounded_search_top_k_count: boundedSearch.product_combination_top_k?.length,
      fractional_micrograms_normalized_to_nanograms: 12_500,
      combination_contract_version:
        matched.product_combination_resolution?.schema_version,
      combination_count: matched.product_combination_resolution?.combination_count,
      shared_product_combination_id: sharedProductCombination?.combination_id,
      shared_product_combination_product_count:
        sharedProductCombination?.product_count,
      duplicate_zinc_combination_id: duplicateZincCombination?.combination_id,
      optimization_constraints_contract_version:
        productContract.optimization_constraints_contract_version,
      combination_filter_contract_version:
        matched.product_combination_resolution?.filter_schema_version,
      unfiltered_policy: {
        schema_version: "product_optimization_constraints_v1",
        max_total_cost_krw: 1_000_000_000,
        max_products: 20,
        excluded_ingredient_keys: [],
        excluded_service_ingredient_ids: [],
        safety_rule_ids: [],
      },
      unfiltered_resolution: matched.product_combination_resolution,
      constrained_resolution: constrained.product_combination_resolution,
      constrained_policy: constrainedPolicy,
      safety_filtered_resolution:
        safetyFiltered.product_combination_resolution,
      safety_filter_policy: {
        schema_version: "product_optimization_constraints_v1",
        max_total_cost_krw: 100_000,
        max_products: 5,
        excluded_ingredient_keys: ["zinc"],
        excluded_service_ingredient_ids: ["ING:ZINC"],
        safety_rule_ids: ["SAFE-OP066-TEST"],
      },
      contradictory_safety_reentry_http_status: contradictoryResponse.status,
      contradictory_safety_reentry_reason:
        contradictory.safety_authority?.reason,
      combination_ranking_contract_version:
        productContract.combination_ranking_contract_version,
      catalog_version_contract_version:
        productContract.catalog_version_contract_version,
      max_ranked_product_combinations:
        productContract.max_ranked_product_combinations,
      top_k: matched.product_combination_top_k,
      non_selection: matched.product_combination_non_selection,
      replay_identity: matched.product_combination_replay,
      repeated_top_k: repeated.product_combination_top_k,
      repeated_non_selection: repeated.product_combination_non_selection,
      repeated_replay_identity: repeated.product_combination_replay,
      reordered_catalog_top_k: reordered.product_combination_top_k,
      reordered_catalog_non_selection:
        reordered.product_combination_non_selection,
      reordered_catalog_replay_identity:
        reordered.product_combination_replay,
      stock_substitution: substituted.product_combination_stock_substitution,
      substituted_cart_candidate:
        substituted.product_combination_cart_candidate,
      inventory_context_forwarded_to_rnd: JSON.stringify(
        upstreamCapture.payload
      ).includes("product_combination_context"),
      order_created: substituted.product_combination_cart_candidate?.order_created,
      ...(process.env.WB_RND_INCLUDE_PRODUCT_COMBINATION_EVIDENCE === "1"
        ? {
            verified_product_combinations: [
              sharedProductCombination,
              duplicateZincCombination,
            ],
          }
        : {}),
      ...(process.env.WB_RND_INCLUDE_PRODUCT_COMBINATION_FILTER_EVIDENCE === "1"
        ? {
            verified_filter_input_combinations:
              matched.product_combinations,
            verified_eligible_product_combinations:
              constrained.product_combinations,
            verified_safety_filter_input_combinations:
              safetyControl.product_combinations,
          }
        : {}),
      ...(process.env.WB_RND_INCLUDE_PRODUCT_COMBINATION_RANKING_EVIDENCE === "1"
        ? { catalog_identity: buildWbRndProductCatalogIdentityForEvidence(combinationProductCatalog) }
        : {}),
      ...(process.env.WB_RND_INCLUDE_PRODUCT_COMBINATION_STOCK_CART_EVIDENCE ===
      "1"
        ? {
            inventory_context: inventoryContext,
            previous_catalog_identity:
              buildWbRndProductCatalogIdentityForEvidence(stockBaselineCatalog),
            current_catalog_identity:
              buildWbRndProductCatalogIdentityForEvidence(stockChangedCatalog),
            previous_combinations: stockBaseline.product_combinations,
            previous_top_k: stockBaseline.product_combination_top_k,
            previous_non_selection:
              stockBaseline.product_combination_non_selection,
            previous_replay_identity:
              stockBaseline.product_combination_replay,
            current_combinations: substituted.product_combinations,
            current_top_k: substituted.product_combination_top_k,
            current_non_selection:
              substituted.product_combination_non_selection,
            current_replay_identity: substituted.product_combination_replay,
          }
        : {}),
    },
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const outputPath = (process.env.WB_RND_PRODUCT_SMOKE_OUTPUT ?? "").trim();
  if (outputPath) writeFileSync(outputPath, serialized, "utf8");
  process.stdout.write(serialized);
}

void run();
