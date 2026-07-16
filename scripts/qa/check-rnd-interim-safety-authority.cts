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

const valid = enforceWbRndInterimSafetyAuthority(blockedResponse());
assert.equal(valid.ok, true);
assert.equal(valid.response.status, "BLOCKED");
assert.deepEqual(valid.response.recommendations, []);
assert.equal(valid.response.safety_authority.mode, "rnd_final");

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
