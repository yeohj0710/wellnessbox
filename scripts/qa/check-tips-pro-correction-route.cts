import assert from "node:assert/strict";

import { runUserInterimProCorrectionRoute } from "../../lib/server/wb-rnd-interim-route";

async function run() {
  const previous = {
    enabled: process.env.WB_RND_INTERIM_ENABLED,
    salt: process.env.WB_RND_INTERIM_PSEUDONYM_SALT,
  };
  process.env.WB_RND_INTERIM_ENABLED = "1";
  process.env.WB_RND_INTERIM_PSEUDONYM_SALT = "op057-local-contract-salt";
  let forwardedPath = "";
  let forwardedBody: unknown;
  try {
    const response = await runUserInterimProCorrectionRoute(
      new Request("http://localhost/api/tips/pro/effects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          execution_id: `exec_${"1".repeat(32)}`,
          target_event_id: `event_${"2".repeat(32)}`,
          idempotency_key: "user-correction-001",
          replacement_payload: { schema_version: "versioned_pro_followup_event_v1" },
          profile_id: "usr_client_value_must_not_win",
        }),
      }),
      {
        requireUserSessionImpl: async () => ({
          ok: true as const,
          data: { appUserId: "service-user-057" },
        }),
        callWbRndInterimImpl: async (path, method, body) => {
          forwardedPath = `${method} ${path}`;
          forwardedBody = body;
          return { recalculated_immediately: true };
        },
      }
    );
    assert.equal(response.status, 200);
    assert.equal(
      forwardedPath,
      "POST /v1/interim/pro/followups/correct-and-recalculate"
    );
    const body = forwardedBody as Record<string, unknown>;
    assert.match(String(body.profile_id), /^usr_[a-f0-9]{32}$/);
    assert.notEqual(body.profile_id, "usr_client_value_must_not_win");
    assert.equal(body.idempotency_key, "user-correction-001");
    assert.deepEqual(await response.json(), { recalculated_immediately: true });
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    process.env.WB_RND_INTERIM_ENABLED = previous.enabled;
    process.env.WB_RND_INTERIM_PSEUDONYM_SALT = previous.salt;
  }
}

void run();
