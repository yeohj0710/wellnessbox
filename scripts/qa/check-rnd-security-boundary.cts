import assert from "node:assert/strict";
import { NextResponse } from "next/server";

import { callWbRndInterim, pseudonymizeInterimUserId } from "../../lib/server/wb-rnd-interim-client";
import {
  runAdminInterimDashboardRoute,
  runPharmInterimDecisionRoute,
  runPharmInterimReviewsRoute,
  runUserInterimProfileRoute,
} from "../../lib/server/wb-rnd-interim-route";
import { mapWellnessBoxProfileToWbRndRequest } from "../../lib/server/wb-rnd-profile-adapter";
import { publicWbRndErrorCode, sanitizeWbRndLogValue } from "../../lib/server/wb-rnd-security";

type JsonRecord = Record<string, unknown>;

const unauthorized = async () => ({
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
});

async function run() {
  const appUserId = "service-user-op111";
  const profileId = pseudonymizeInterimUserId(appUserId);
  const userAuth = async () => ({
    ok: true as const,
    data: { appUserId, kakaoId: "111", phone: "010-1234-5678" },
  });
  const pharmAuth = async () => ({ ok: true as const, data: { pharmacyId: 112 } });

  for (const response of [
    await runUserInterimProfileRoute(new Request("http://service.test/profile", { method: "POST", body: "{}" }), {
      requireUserSessionImpl: unauthorized,
      callWbRndInterimImpl: async () => assert.fail("unauthorized user reached R&D"),
    }),
    await runPharmInterimReviewsRoute({
      requirePharmSessionImpl: unauthorized,
      callWbRndInterimImpl: async () => assert.fail("unauthorized pharmacy reached R&D"),
    }),
    await runAdminInterimDashboardRoute({
      requireAdminSessionImpl: unauthorized,
      callWbRndInterimImpl: async () => assert.fail("unauthorized admin reached R&D"),
    }),
  ]) {
    assert.equal(response.status, 401);
  }

  let userBody: JsonRecord | undefined;
  const userResponse = await runUserInterimProfileRoute(
    new Request("http://service.test/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "usr_attacker", phone: "010-9999-9999", profile: { age: 44 } }),
    }),
    {
      requireUserSessionImpl: userAuth,
      callWbRndInterimImpl: async (_path, _method, body) => {
        userBody = body as JsonRecord;
        return { stored: true };
      },
    }
  );
  assert.equal(userResponse.status, 200);
  assert.equal(userBody?.profile_id, profileId);
  assert.equal("phone" in (userBody ?? {}), false);

  let queuePath = "";
  await runPharmInterimReviewsRoute({
    requirePharmSessionImpl: pharmAuth,
    callWbRndInterimImpl: async (path) => {
      queuePath = path;
      return { items: [] };
    },
  });
  assert.match(queuePath, /pharmacy_id=112/);

  let decisionBody: JsonRecord | undefined;
  await runPharmInterimDecisionRoute(
    new Request("http://service.test/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pharmacy_id: 999, decision: "REJECT" }),
    }),
    "review_a1",
    {
      requirePharmSessionImpl: pharmAuth,
      callWbRndInterimImpl: async (_path, _method, body) => {
        decisionBody = body as JsonRecord;
        return { status: "COMPLETED" };
      },
    }
  );
  assert.equal(decisionBody?.pharmacy_id, 112);

  const adapted = mapWellnessBoxProfileToWbRndRequest(
    {
      name: "홍길동",
      age: 44,
      sex: "male",
      goals: ["sleep"],
      caffeineSensitivity: true,
      medications: ["warfarin"],
    },
    {
      requestId: "op112-minimum",
      subjectId: profileId,
      surveyConsent: { useForRecommendation: true, allowPersistentStorage: false },
    }
  );
  const sourceProfile = adapted.source_profile?.profile as JsonRecord;
  assert.equal("name" in sourceProfile, false);
  assert.equal("caffeineSensitivity" in sourceProfile, false);
  assert.equal(adapted.source_profile?.subject_id, profileId);

  const masked = sanitizeWbRndLogValue({
    authorization: "Bearer secret-token",
    email: "person@example.com",
    nested: { phone: "010-1234-5678", message: "contact person@example.com" },
  }) as JsonRecord;
  assert.equal(masked.authorization, "[REDACTED]");
  assert.equal(masked.email, "[REDACTED]");
  assert.deepEqual(masked.nested, { phone: "[REDACTED]", message: "contact [REDACTED]" });
  assert.equal(publicWbRndErrorCode(new Error("patient person@example.com")), "R&D request failed");

  const validStatus = await callWbRndInterim<JsonRecord>("/v1/interim/status", "GET");
  assert.equal(typeof validStatus.counts, "object");
  const validToken = process.env.WB_RND_INTERIM_TOKEN;
  process.env.WB_RND_INTERIM_TOKEN = "invalid-op111-token";
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/status", "GET"),
    /WB_RND_INTERIM_upstream_401/
  );
  process.env.WB_RND_INTERIM_TOKEN = validToken;

  console.log(JSON.stringify({
    ok: true,
    deniedRoles: ["user", "pharmacy", "admin"],
    userProfileSpoofIgnored: userBody?.profile_id === profileId,
    pharmacyScopeOverridden: decisionBody?.pharmacy_id === 112,
    internalTokenAccepted: true,
    invalidInternalTokenRejected: true,
    directIdentifierRemoved: !("name" in sourceProfile),
    unusedFieldRemoved: !("caffeineSensitivity" in sourceProfile),
    logsMasked: true,
    publicErrorsBounded: true,
    profileId,
  }));
}

void run();
