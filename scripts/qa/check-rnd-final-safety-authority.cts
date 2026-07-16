import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

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
  assert.equal(response.safety_authority?.final, true);
  assert.equal(response.safety_authority?.mode, "rnd_final");

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
