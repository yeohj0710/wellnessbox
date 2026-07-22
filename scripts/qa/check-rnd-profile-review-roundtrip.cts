import assert from "node:assert/strict";
import { NextResponse } from "next/server";

import { callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import { pseudonymizeInterimUserId } from "../../lib/server/wb-rnd-interim-client";
import {
  runPharmInterimDecisionRoute,
  runPharmInterimReviewsRoute,
  runUserInterimProfileRoute,
  runUserInterimRecommendationRoute,
} from "../../lib/server/wb-rnd-interim-route";

type RecordValue = Record<string, unknown>;

async function run() {
  const appUserId = "service-user-op105";
  const profileId = pseudonymizeInterimUserId(appUserId);
  const userAuth = async () => ({
    ok: true as const,
    data: { appUserId, kakaoId: "105", phone: null },
  });
  const pharmAuth = async () => ({ ok: true as const, data: { pharmacyId: 105 } });
  const deniedProfile = await runUserInterimProfileRoute(
    new Request("http://service.test/api/tips/profile", {
      method: "POST",
      body: "{}",
    }),
    {
      requireUserSessionImpl: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
      callWbRndInterimImpl: async () => assert.fail("unauthorized request reached R&D"),
    }
  );
  assert.equal(deniedProfile.status, 401);
  const deniedPharm = await runPharmInterimReviewsRoute({
    requirePharmSessionImpl: async () => ({
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }),
    callWbRndInterimImpl: async () => assert.fail("unauthorized pharmacy reached R&D"),
  });
  assert.equal(deniedPharm.status, 401);
  const profileResponse = await runUserInterimProfileRoute(
    new Request("http://service.test/api/tips/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: "usr_browser_supplied_id_must_be_ignored",
      consent_scopes: ["recommendation:read"],
      profile: {
        age: 41,
        pregnant: true,
        medications: [{ name: "warfarin" }],
        symptoms: ["fatigue"],
      },
      }),
    }),
    { requireUserSessionImpl: userAuth, callWbRndInterimImpl: callWbRndInterim }
  );
  assert.equal(profileResponse.status, 200);
  const profile = (await profileResponse.json()) as RecordValue;
  assert.equal(profile.profile_id, profileId);

  const recommendationResponse = await runUserInterimRecommendationRoute(
    new Request("http://service.test/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      profile_id: "usr_browser_supplied_id_must_be_ignored",
      goals: ["heart_health"],
      ingredients: ["omega3"],
      safety: {},
      }),
    }),
    { requireUserSessionImpl: userAuth, callWbRndInterimImpl: callWbRndInterim }
  );
  assert.equal(recommendationResponse.status, 200);
  const recommendation = (await recommendationResponse.json()) as RecordValue;
  assert.equal(typeof recommendation.run_id, "string");
  assert.equal(recommendation.status, "BLOCKED");
  assert.deepEqual(recommendation.recommendations, []);

  const queueResponse = await runPharmInterimReviewsRoute({
    requirePharmSessionImpl: pharmAuth,
    callWbRndInterimImpl: callWbRndInterim,
  });
  assert.equal(queueResponse.status, 200);
  const queue = (await queueResponse.json()) as RecordValue;
  assert.equal(queue.mode, "PROXY_GOLD_SIMULATION");
  assert.ok(Array.isArray(queue.items));
  const review = (queue.items as RecordValue[]).find(
    (item) => item.profile_id === profileId
  );
  assert.ok(review, "canonical review must be visible to the pharmacy");

  const decisionResponse = await runPharmInterimDecisionRoute(
    new Request("http://service.test/api/pharm/tips/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pharmacy_id: 999, decision: "APPROVE", note: "canonical integration" }),
    }),
    String(review.review_id),
    { requirePharmSessionImpl: pharmAuth, callWbRndInterimImpl: callWbRndInterim }
  );
  assert.equal(decisionResponse.status, 200);
  const decision = (await decisionResponse.json()) as RecordValue;
  assert.equal(decision.status, "COMPLETED");
  assert.equal(decision.immutable, true);
  assert.equal(
    (decision.postconditions as RecordValue).pharmacy_id,
    105
  );

  const replayResponse = await runPharmInterimDecisionRoute(
      new Request("http://service.test/replay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "REJECT" }) }),
      String(review.review_id),
      { requirePharmSessionImpl: pharmAuth, callWbRndInterimImpl: callWbRndInterim }
  );
  assert.equal(replayResponse.status, 409);

  console.log(
    JSON.stringify({
      ok: true,
      profileId,
      recommendationRunId: recommendation.run_id,
      recommendationStatus: recommendation.status,
      reviewId: review.review_id,
      reviewStatus: decision.status,
      immutableReplayRejected: true,
      userAuthDenied: deniedProfile.status === 401,
      pharmacistAuthDenied: deniedPharm.status === 401,
      browserProfileIdIgnored: profile.profile_id === profileId,
      pharmacyIdOverridden:
        (decision.postconditions as RecordValue).pharmacy_id === 105,
    })
  );
}

void run();
