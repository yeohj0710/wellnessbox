import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { POST as postTipsRecommendation } from "../../app/api/tips/route";
import { type callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import type { WbRndRecommendationRouteDependencies } from "../../lib/server/wb-rnd-interim-route";
import { setTipsPostTestDependencies } from "../../lib/server/wb-rnd-tips-route-test-hook";

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
  uncertainty: "op050 route fixture",
};

const productCatalog = catalogSnapshot.products;
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

async function routeWithCatalog(catalog: unknown) {
  const requireUserSessionImpl = (async () => ({
    ok: true,
    data: { appUserId: "op050-user" },
  })) as WbRndRecommendationRouteDependencies["requireUserSessionImpl"];
  const callWbRndInterimImpl = (async () =>
    readyFixture) as typeof callWbRndInterim;
  const listProductCatalogImpl = (async () =>
    catalog) as unknown as WbRndRecommendationRouteDependencies["listProductCatalogImpl"];
  const request = new Request("http://wellnessbox.local/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals: ["sleep_support"] }),
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

  const matchedResponse = await routeWithCatalog(productCatalog);
  const matched = (await matchedResponse.json()) as {
    status?: string;
    recommendations?: Array<{
      service_ingredient_id?: string;
      product_candidate_status?: string;
      product_candidates?: Array<{ product_id?: number; match_basis?: string }>;
    }>;
    product_candidate_resolution?: {
      mapping_version?: string;
      ingredient_mapping_version?: string;
      complete?: boolean;
      matched_recommendation_count?: number;
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
    matched.product_candidate_resolution?.ingredient_mapping_version,
    ingredientContract.mapping_version
  );
  assert.equal(
    matched.product_candidate_resolution?.matched_recommendation_count,
    ingredientContract.mappings.length
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

  const report = {
    ok: true,
    schema_version: "op050_service_product_candidate_contract_v1",
    checks: [
      "product_match_contract_covers_every_mapped_service_ingredient",
      "api_tips_maps_rnd_ingredients_to_service_ingredients",
      "mapped_service_ingredients_resolve_to_catalog_fixture_product_ids",
      "no_match_is_explicit_and_does_not_invent_product_ids",
      "invalid_product_catalog_fails_closed",
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
    },
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const outputPath = (process.env.WB_RND_PRODUCT_SMOKE_OUTPUT ?? "").trim();
  if (outputPath) writeFileSync(outputPath, serialized, "utf8");
  process.stdout.write(serialized);
}

void run();
