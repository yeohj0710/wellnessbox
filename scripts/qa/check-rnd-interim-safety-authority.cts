import assert from "node:assert/strict";

import {
  buildWbRndInterimFailClosedResponse,
  enforceWbRndInterimSafetyAuthority,
} from "../../lib/server/wb-rnd-interim-safety-authority";

function blockedResponse(overrides: Record<string, unknown> = {}) {
  return {
    run_id: "rec_contract_blocked",
    status: "BLOCKED",
    mode: "PROXY_GOLD_SIMULATION",
    simulation: true,
    model_id: null,
    safety_action: "STOP_AND_ESCALATE",
    findings: [
      {
        rule_id: "SAFE-EMERGENCY-001",
        category: "emergency",
        action: "STOP_AND_ESCALATE",
        reason: "emergency_symptom",
        reference_ids: [],
        claim_ids: [],
      },
    ],
    recommendations: [],
    uncertainty: "independent contract fixture",
    ...overrides,
  };
}

function readyResponse(ingredient: string) {
  return {
    run_id: "rec_contract_ready",
    status: "READY",
    mode: "PROXY_GOLD_SIMULATION",
    simulation: true,
    model_id: "model_contract",
    safety_action: "PASS",
    findings: [],
    recommendations: [
      {
        ingredient,
        rank: 1,
        score: 0.8,
        evidence_ids: ["EV-1"],
      },
    ],
    uncertainty: "independent contract fixture",
  };
}

const valid = enforceWbRndInterimSafetyAuthority(blockedResponse());
assert.equal(valid.ok, true);
assert.equal(valid.response.status, "BLOCKED");
assert.deepEqual(valid.response.recommendations, []);
assert.equal(valid.response.safety_authority.mode, "rnd_final");
assert.equal(
  valid.response.ingredient_identifier_mapping.mapping_version,
  "2026-07-16.1"
);

const mappedReady = enforceWbRndInterimSafetyAuthority(
  readyResponse("magnesium_glycinate")
);
assert.equal(mappedReady.ok, true);
assert.equal(
  mappedReady.response.recommendations[0].service_ingredient_id,
  "ING:MAGNESIUM"
);

const unmappedReady = enforceWbRndInterimSafetyAuthority(
  readyResponse("l_theanine")
);
assert.equal(unmappedReady.ok, false);
assert.equal(
  unmappedReady.response.safety_authority.reason,
  "unmapped_rnd_ingredient_identifier"
);
assert.deepEqual(unmappedReady.response.recommendations, []);

for (const invalid of [
  blockedResponse({ recommendations: [{ ingredient: "unsafe" }] }),
  blockedResponse({ status: "READY" }),
  blockedResponse({ safety_action: "PASS" }),
  blockedResponse({ safety_action: "__proto__" }),
  blockedResponse({ findings: [] }),
]) {
  const enforced = enforceWbRndInterimSafetyAuthority(invalid);
  assert.equal(enforced.ok, false);
  assert.equal(enforced.response.status, "BLOCKED");
  assert.deepEqual(enforced.response.recommendations, []);
  assert.equal(enforced.response.safety_authority.mode, "service_fail_closed");
}

const transportFailure = buildWbRndInterimFailClosedResponse("network_error");
assert.equal(transportFailure.status, "BLOCKED");
assert.deepEqual(transportFailure.recommendations, []);
assert.equal(transportFailure.safety_authority.reason, "network_error");

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "valid_block_preserved",
        "mapped_ready_identifier_enriched",
        "unmapped_ready_identifier_blocked",
        "recommendation_under_block_rejected",
        "status_action_mismatch_rejected",
        "prototype_action_rejected",
        "missing_blocker_rejected",
        "transport_failure_blocked",
      ],
    },
    null,
    2
  )
);
