import assert from "node:assert/strict";

import { callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";

type RecordValue = Record<string, unknown>;

async function run() {
  const profileId = "usr_105106abcdef0123456789abcdef";
  const profile = await callWbRndInterim<RecordValue>(
    "/v1/interim/profiles",
    "POST",
    {
      profile_id: profileId,
      consent_scopes: ["recommendation:read"],
      profile: { age: 41, symptoms: ["fatigue"] },
    }
  );
  assert.equal(profile.profile_id, profileId);

  const recommendation = await callWbRndInterim<RecordValue>(
    "/v1/interim/recommendations",
    "POST",
    {
      profile_id: profileId,
      goals: ["sleep"],
      ingredients: ["magnesium"],
      current_safety_input: {},
    }
  );
  assert.equal(recommendation.profile_id, profileId);
  assert.equal(typeof recommendation.run_id, "string");
  assert.ok(["READY", "BLOCKED", "NEEDS_REVIEW"].includes(String(recommendation.status)));

  const queue = await callWbRndInterim<RecordValue>(
    "/v1/interim/admin/reviews?pharmacy_id=105",
    "GET"
  );
  assert.equal(queue.mode, "PROXY_GOLD_SIMULATION");
  assert.ok(Array.isArray(queue.items));
  const review = (queue.items as RecordValue[]).find(
    (item) => item.profile_id === profileId
  );
  assert.ok(review, "canonical review must be visible to the pharmacy");

  const decision = await callWbRndInterim<RecordValue>(
    `/v1/interim/admin/reviews/${review.review_id}/decision`,
    "POST",
    { pharmacy_id: 105, decision: "APPROVE", note: "canonical integration" }
  );
  assert.equal(decision.status, "COMPLETED");
  assert.equal(decision.immutable, true);
  assert.equal(
    (decision.postconditions as RecordValue).pharmacy_id,
    105
  );

  await assert.rejects(
    callWbRndInterim(
      `/v1/interim/admin/reviews/${review.review_id}/decision`,
      "POST",
      { pharmacy_id: 105, decision: "REJECT" }
    ),
    /WB_RND_INTERIM_upstream_409/
  );

  console.log(
    JSON.stringify({
      ok: true,
      profileId,
      recommendationRunId: recommendation.run_id,
      recommendationStatus: recommendation.status,
      reviewId: review.review_id,
      reviewStatus: decision.status,
      immutableReplayRejected: true,
    })
  );
}

void run();
