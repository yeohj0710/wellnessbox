import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  pseudonymizeInterimUserId,
  type callWbRndInterim,
} from "../../lib/server/wb-rnd-interim-client";
import {
  type WbRndRecommendationRouteDependencies,
} from "../../lib/server/wb-rnd-interim-route";
import {
  POST as postTipsRecommendation,
} from "../../app/api/tips/route";
import { setTipsPostTestDependencies } from "../../lib/server/wb-rnd-tips-route-test-hook";

process.env.NODE_ENV = "test";

const productCatalogSnapshot = JSON.parse(
  readFileSync(
    resolve("contracts/wb-rnd/product-candidate-catalog-snapshot-v1.json"),
    "utf8"
  )
) as {
  products: Array<{ id: number; name: string; categories: string[] }>;
};
const productCatalog = productCatalogSnapshot.products.map((product, index) => ({
  ...product,
  ingredientDeclarations: product.categories.map((category, categoryIndex) => ({
    label: "기능 성분 함량",
    value: `${category} ${100 + index * 10 + categoryIndex} mg`,
  })),
  formulation: index % 2 === 0 ? "캡슐" : "정제",
  formulationKind: index % 2 === 0 ? "capsule" : "tablet",
  offers: [
    {
      pharmacyProductId: 20_000 + product.id,
      priceKrw: 10_000 + index * 1_000,
      stockCount: 5 + index,
      optionType: "30일분",
      capacity: "30정",
    },
  ],
}));

async function run() {
  const serviceBaseUrl = (process.env.WB_RND_INTERIM_BASE_URL ?? "").trim();
  const token = (process.env.WB_RND_INTERIM_TOKEN ?? "").trim();
  assert.ok(serviceBaseUrl, "WB_RND_INTERIM_BASE_URL is required");
  assert.ok(token, "WB_RND_INTERIM_TOKEN is required");

  const appUserId = "op040-two-process-user";
  const profileId = pseudonymizeInterimUserId(appUserId);
  const profileResponse = await fetch(`${serviceBaseUrl}/v1/interim/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wb-rnd-token": token,
    },
    body: JSON.stringify({
      profile_id: profileId,
      consent_scopes: ["recommendation:read"],
      profile: {
        age: 52,
        symptoms: ["chest pain"],
        conditions: [],
        medications: [],
        allergies: [],
      },
    }),
  });
  assert.equal(profileResponse.status, 200);

  const requireUserSessionImpl = (async () => ({
    ok: true,
    data: { appUserId },
  })) as WbRndRecommendationRouteDependencies["requireUserSessionImpl"];
  const routeRequest = new Request("http://wellnessbox.local/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: ["heart_health"],
        ingredients: [],
        safety: { symptoms: ["chest pain"] },
      }),
    });
  setTipsPostTestDependencies(routeRequest, { requireUserSessionImpl });
  const routeResponse = await postTipsRecommendation(routeRequest);
  const response = (await routeResponse.json()) as {
    status?: string;
    safety_action?: string;
    findings?: Array<{ rule_id?: string; action?: string }>;
    recommendations?: unknown[];
    product_candidate_resolution?: unknown;
    safety_authority?: { final?: boolean; mode?: string; reason?: string | null };
  };

  assert.equal(routeResponse.status, 200);
  assert.equal(response.status, "BLOCKED");
  assert.equal(response.safety_action, "STOP_AND_ESCALATE");
  assert.ok(
    response.findings?.some(
      (finding) =>
        finding.rule_id === "SAFE-EMERGENCY-001" &&
        finding.action === "STOP_AND_ESCALATE"
    )
  );
  assert.deepEqual(response.recommendations, []);
  assert.equal(response.product_candidate_resolution, undefined);
  assert.equal(response.safety_authority?.final, true);
  assert.equal(response.safety_authority?.mode, "rnd_final");

  const readyFixture = {
    run_id: "rec_mapping_ready",
    status: "READY",
    mode: "PROXY_GOLD_SIMULATION",
    simulation: true,
    model_id: "mapping-fixture",
    safety_action: "PASS",
    findings: [],
    recommendations: [
      {
        ingredient: "magnesium_glycinate",
        rank: 1,
        score: 0.8,
        evidence_ids: ["EV-1"],
      },
    ],
    uncertainty: "mapping fixture",
  };
  const readyUpstream = (async () => readyFixture) as typeof callWbRndInterim;
  const listProductCatalogImpl = async () => productCatalog;
  const readyRequest = new Request("http://wellnessbox.local/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals: ["sleep_support"] }),
  });
  setTipsPostTestDependencies(readyRequest, {
    requireUserSessionImpl,
    callWbRndInterimImpl: readyUpstream,
    listProductCatalogImpl,
  });
  const readyRouteResponse = await postTipsRecommendation(readyRequest);
  const ready = (await readyRouteResponse.json()) as {
    status?: string;
    recommendations?: Array<{
      ingredient?: string;
      service_ingredient_id?: string;
      product_candidate_status?: string;
      product_candidates?: Array<{
        product_id?: number;
        product_name?: string;
      }>;
    }>;
    ingredient_identifier_mapping?: { mapping_version?: string };
    product_candidate_resolution?: {
      mapping_version?: string;
      complete?: boolean;
    };
  };
  assert.equal(readyRouteResponse.status, 200);
  assert.equal(ready.status, "READY");
  assert.equal(ready.recommendations?.[0]?.ingredient, "magnesium_glycinate");
  assert.equal(
    ready.recommendations?.[0]?.service_ingredient_id,
    "ING:MAGNESIUM"
  );
  assert.equal(ready.recommendations?.[0]?.product_candidate_status, "MATCHED");
  assert.equal(
    ready.recommendations?.[0]?.product_candidates?.[0]?.product_id,
    29
  );
  assert.equal(
    ready.recommendations?.[0]?.product_candidates?.[0]?.product_name,
    "종근당 칼슘 앤 마그네슘 비타민D 아연"
  );
  assert.equal(ready.product_candidate_resolution?.complete, true);
  assert.equal(
    ready.ingredient_identifier_mapping?.mapping_version,
    "2026-07-16.1"
  );

  const unmappedUpstream = (async () => ({
    ...readyFixture,
    run_id: "rec_mapping_unmapped",
    recommendations: [
      {
        ingredient: "l_theanine",
        rank: 1,
        score: 0.8,
        evidence_ids: ["EV-1"],
      },
    ],
  })) as typeof callWbRndInterim;
  const unmappedRequest = new Request("http://wellnessbox.local/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals: ["stress_support"] }),
  });
  setTipsPostTestDependencies(unmappedRequest, {
    requireUserSessionImpl,
    callWbRndInterimImpl: unmappedUpstream,
  });
  const unmappedRouteResponse = await postTipsRecommendation(unmappedRequest);
  const unmapped = (await unmappedRouteResponse.json()) as {
    status?: string;
    recommendations?: unknown[];
    safety_authority?: { reason?: string | null };
  };
  assert.equal(unmappedRouteResponse.status, 502);
  assert.equal(unmapped.status, "BLOCKED");
  assert.deepEqual(unmapped.recommendations, []);
  assert.equal(
    unmapped.safety_authority?.reason,
    "unmapped_rnd_ingredient_identifier"
  );

  const invalidUpstream = (async () => ({
    run_id: "rec_invalid",
    status: "BLOCKED",
    mode: "PROXY_GOLD_SIMULATION",
    simulation: true,
    model_id: "invalid-contract",
    safety_action: "BLOCK",
    findings: [
      {
        rule_id: "SAFE-INVALID-001",
        category: "invalid",
        action: "BLOCK",
        reason: "invalid",
        reference_ids: [],
        claim_ids: [],
      },
    ],
    recommendations: [{ ingredient: "unsafe" }],
    uncertainty: "invalid upstream fixture",
  })) as typeof callWbRndInterim;
  const failClosedRequest = new Request("http://wellnessbox.local/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals: ["heart_health"] }),
    });
  setTipsPostTestDependencies(failClosedRequest, {
    requireUserSessionImpl,
    callWbRndInterimImpl: invalidUpstream,
  });
  const failClosedRouteResponse = await postTipsRecommendation(
    failClosedRequest
  );
  const failClosed = (await failClosedRouteResponse.json()) as {
    status?: string;
    recommendations?: unknown[];
    safety_authority?: { mode?: string; reason?: string | null };
  };
  assert.equal(failClosedRouteResponse.status, 502);
  assert.equal(failClosed.status, "BLOCKED");
  assert.deepEqual(failClosed.recommendations, []);
  assert.equal(failClosed.safety_authority?.mode, "service_fail_closed");
  assert.equal(
    failClosed.safety_authority?.reason,
    "invalid_upstream_recommendation_contract"
  );

  const report = {
    ok: true,
    schema_version: "op040_final_safety_authority_client_smoke_v2",
    checks: [
      "api_tips_post_export",
      "real_http_rnd_interim_response",
      "expected_emergency_rule_matched",
      "rnd_final_authority",
      "top_level_blocked",
      "zero_recommendations",
      "mapped_ready_identifier_enriched",
      "mapped_ready_service_product_candidate_resolved",
      "unmapped_ready_identifier_fail_closed",
      "invalid_upstream_contract_fail_closed",
    ],
    observed: {
      service_route: "POST /api/tips",
      rnd_route: "POST /v1/interim/recommendations",
      source: "rnd_interim",
      authority_mode: response.safety_authority?.mode,
      status: response.status,
      safety_action: response.safety_action,
      matched_rule_id: "SAFE-EMERGENCY-001",
      recommendation_count: response.recommendations?.length,
      mapping_version: ready.ingredient_identifier_mapping?.mapping_version,
      mapped_service_ingredient_id:
        ready.recommendations?.[0]?.service_ingredient_id,
      mapped_service_product_id:
        ready.recommendations?.[0]?.product_candidates?.[0]?.product_id,
      product_candidate_mapping_version:
        ready.product_candidate_resolution?.mapping_version,
      unmapped_identifier_http_status: unmappedRouteResponse.status,
      invalid_contract_http_status: failClosedRouteResponse.status,
      invalid_contract_authority_mode: failClosed.safety_authority?.mode,
    },
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const outputPath = (process.env.WB_RND_AUTHORITY_SMOKE_OUTPUT ?? "").trim();
  if (outputPath) writeFileSync(outputPath, serialized, "utf8");
  process.stdout.write(serialized);
}

void run();
