import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

  const routeAuthSource = readFileSync("lib/server/route-auth.ts", "utf8");
  const routeSource = readFileSync("lib/server/wb-rnd-interim-route.ts", "utf8");
  for (const token of [
    "requireUserSession",
    "requirePharmSession",
    "requireAdminSession",
    "session.user?.loggedIn",
    "session.pharm?.loggedIn",
    "session.admin?.loggedIn",
  ]) assert.match(`${routeAuthSource}\n${routeSource}`, new RegExp(token.replace("?", "\\?")));

  const directIdentifierResponse = await runUserInterimProfileRoute(
    new Request("http://service.test/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: { name: "홍길동", email: "person@example.com", phone: "010-1234-5678" } }),
    }),
    {
      requireUserSessionImpl: userAuth,
      callWbRndInterimImpl: async () => assert.fail("direct identifier reached R&D"),
    }
  );
  assert.equal(directIdentifierResponse.status, 502);
  assert.deepEqual(await directIdentifierResponse.json(), { error: "invalid_profile_payload" });

  let userBody: JsonRecord | undefined;
  const userResponse = await runUserInterimProfileRoute(
    new Request("http://service.test/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "usr_attacker", phone: "010-9999-9999", profile: { age: 44, symptoms: ["fatigue"] } }),
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

  const adminCalls: string[] = [];
  const adminResponse = await runAdminInterimDashboardRoute({
    requireAdminSessionImpl: async () => ({ ok: true as const, data: null }),
    callWbRndInterimImpl: async (path) => {
      adminCalls.push(path);
      if (path.endsWith("/kpis")) throw new Error("person@example.com");
      if (path.endsWith("/status")) return { counts: {} };
      if (path.endsWith("/sources")) return { items: [], adapters: [] };
      if (path.endsWith("/runtime")) return { rules: {}, models: {}, executions: {} };
      return assert.fail(`unexpected admin path: ${path}`);
    },
  });
  const adminBody = await adminResponse.json() as JsonRecord;
  assert.equal(adminResponse.status, 200);
  assert.deepEqual(adminCalls, [
    "/v1/interim/status",
    "/v1/interim/kpis",
    "/v1/interim/admin/sources",
    "/v1/interim/admin/runtime",
  ]);
  assert.deepEqual(adminBody.kpis, { availability: "UNAVAILABLE", error: "R&D request failed" });

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

  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...items: unknown[]) => warnings.push(items);
  try {
    const bounded = await runUserInterimProfileRoute(
      new Request("http://service.test/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { age: 44 } }),
      }),
      {
        requireUserSessionImpl: userAuth,
        callWbRndInterimImpl: async () => { throw new Error("person@example.com 010-1234-5678 Bearer secret-token"); },
      }
    );
    assert.deepEqual(await bounded.json(), { error: "R&D request failed" });
  } finally {
    console.warn = originalWarn;
  }
  const warningText = JSON.stringify(warnings);
  assert.equal(warningText.includes("person@example.com"), false);
  assert.equal(warningText.includes("010-1234-5678"), false);
  assert.equal(warningText.includes("secret-token"), false);
  assert.match(warningText, /REDACTED/);

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
    operationalLogCallSiteMasked: true,
    publicErrorsBounded: true,
    directIdentifierPayloadRejected: directIdentifierResponse.status === 502,
    roleGuardSourceContractVerified: true,
    authenticatedAdminBranchExecuted: adminResponse.status === 200,
    adminFallbackBounded: (adminBody.kpis as JsonRecord).error === "R&D request failed",
    profileId,
  }));
}

void run();
