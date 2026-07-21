import assert from "node:assert/strict";

import {
  runUserInterimProFollowUpRoute,
  runUserInterimProPlanRoute,
} from "../../lib/server/wb-rnd-interim-route";

async function run() {
  const previous = {
    enabled: process.env.WB_RND_INTERIM_ENABLED,
    salt: process.env.WB_RND_INTERIM_PSEUDONYM_SALT,
  };
  process.env.WB_RND_INTERIM_ENABLED = "1";
  process.env.WB_RND_INTERIM_PSEUDONYM_SALT = "op057-local-contract-salt";
  const calls: Array<{ path: string; method: string; body: unknown }> = [];
  const dependencies = {
    requireUserSessionImpl: async () => ({ ok: true as const, data: { appUserId: "service-user-057" } }),
    callWbRndInterimImpl: async (path: string, method: string, body?: unknown) => {
      calls.push({ path, method, body });
      return { ok: true };
    },
  };
  try {
    const planResponse = await runUserInterimProPlanRoute(
      new Request("http://localhost/api/tips/pro/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: { name: "테스터", age: 41, sex: "other", goals: ["sleep quality"] },
          baseline: { instrument: "PSQI", item_scores: [2, 2, 2, 2, 2, 2, 2] },
          observedAt: "2026-01-01T00:00:00Z",
          consentAccepted: true,
          recommendation_request: { plan_id: "attacker-plan" },
        }),
      }),
      dependencies
    );
    assert.equal(planResponse.status, 200);
    const planBody = calls[0].body as Record<string, any>;
    assert.equal(calls[0].path, "/v1/interim/pro/plans");
    assert.match(planBody.recommendation_request.source_profile.subject_id, /^usr_[a-f0-9]{32}$/);
    assert.equal(planBody.recommendation_request.plan_id, undefined);
    assert.equal(planBody.recommendation_request.data_source_consents.survey.allow_persistent_storage, true);

    const followUpResponse = await runUserInterimProFollowUpRoute(
      new Request("http://localhost/api/tips/pro/effects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          executionId: `exec_${"1".repeat(32)}`,
          planId: "plan_runtime_001",
          timepoint: "week_2",
          answers: { instrument: "PSQI", item_scores: [1, 1, 1, 1, 1, 1, 1] },
          observedAt: "2026-01-15T00:00:00Z",
          actualDayIndex: 14,
          plannedDoseCount: 14,
          takenDoseCount: 13,
          profile_id: "usr_client_value_must_not_win",
        }),
      }),
      dependencies
    );
    assert.equal(followUpResponse.status, 200);
    const followBody = calls[1].body as Record<string, unknown>;
    assert.equal(calls[1].path, "/v1/interim/pro/followups");
    assert.match(String(followBody.profile_id), /^usr_[a-f0-9]{32}$/);
    assert.notEqual(followBody.profile_id, "usr_client_value_must_not_win");
    assert.equal(followBody.plan_id, "plan_runtime_001");
  } finally {
    process.env.WB_RND_INTERIM_ENABLED = previous.enabled;
    process.env.WB_RND_INTERIM_PSEUDONYM_SALT = previous.salt;
  }
}

void run();
