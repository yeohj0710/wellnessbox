import assert from "node:assert/strict";
import { createServer } from "node:http";

const executionId = "exec_0123456789abcdef0123456789abcdef";
const requests: Array<{ method: string; url: string; token: string | undefined }> = [];
type ResponseMode =
  | "valid"
  | "invalid-json"
  | "malformed-list"
  | "inconsistent-replay"
  | "http-error"
  | "timeout";
let responseMode: ResponseMode = "valid";

function savedSessionSummaryPayload() {
  return {
    total_saved_sessions: 3,
    replayable_sessions: 2,
    unavailable_sessions: 1,
    replay_run_count: 4,
    items: [
      {
        execution_id: executionId,
        created_at: "2026-07-16T01:02:03+00:00",
        execution_status: "RECOMMENDATION_COMPLETED",
        replay_available: true,
        last_replay_status: "MATCH",
        last_replayed_at: "2026-07-16T01:03:00+00:00",
      },
    ],
  };
}

const server = createServer((req, res) => {
  requests.push({
    method: req.method ?? "",
    url: req.url ?? "",
    token: req.headers["x-wb-rnd-token"] as string | undefined,
  });
  res.setHeader("Content-Type", "application/json");
  if (responseMode === "invalid-json") {
    res.end("{");
    return;
  }
  if (responseMode === "http-error") {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "service_unavailable" }));
    return;
  }
  if (responseMode === "timeout") {
    setTimeout(() => res.end(JSON.stringify(savedSessionSummaryPayload())), 900);
    return;
  }
  if (req.method === "GET" && req.url === "/v1/interim/executions?limit=20") {
    if (responseMode === "malformed-list") {
      res.end(
        JSON.stringify({
          total_saved_sessions: 1,
          replayable_sessions: 1,
          unavailable_sessions: 0,
          replay_run_count: 0,
          items: [{ execution_id: "invalid", replay_available: true }],
        })
      );
      return;
    }
    res.end(JSON.stringify(savedSessionSummaryPayload()));
    return;
  }
  if (
    req.method === "POST" &&
    req.url === `/v1/interim/executions/${executionId}/replay`
  ) {
    if (responseMode === "inconsistent-replay") {
      res.end(
        JSON.stringify({
          execution_id: executionId,
          status: "MATCH",
          input_match: true,
          version_match: true,
          output_match: false,
          replayed_at: "2026-07-16T01:04:00+00:00",
        })
      );
      return;
    }
    res.end(
      JSON.stringify({
        replay_id: "replay_0123456789abcdef0123456789abcdef",
        execution_id: executionId,
        status: "MATCH",
        input_match: true,
        version_match: true,
        output_match: true,
        replayed_at: "2026-07-16T01:04:00+00:00",
      })
    );
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const original = {
    enabled: process.env.WB_RND_INTERIM_ENABLED,
    baseUrl: process.env.WB_RND_INTERIM_BASE_URL,
    token: process.env.WB_RND_INTERIM_TOKEN,
    timeout: process.env.WB_RND_INTERIM_TIMEOUT_MS,
  };
  process.env.WB_RND_INTERIM_ENABLED = "1";
  process.env.WB_RND_INTERIM_BASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.WB_RND_INTERIM_TOKEN = "session-replay-test-token";
  process.env.WB_RND_INTERIM_TIMEOUT_MS = "500";

  try {
    const {
      listRndSavedSessions,
      replayRndSavedSession,
    } = await import("../../lib/server/tips-lab/rnd-session-replay");

    const summary = await listRndSavedSessions();
    assert.equal(summary.connected, true);
    assert.equal(summary.availability, "CONNECTED");
    assert.equal(summary.totalSavedSessions, 3);
    assert.equal(summary.replayableSessions, 2);
    assert.equal(summary.unavailableSessions, 1);
    assert.equal(summary.replayRunCount, 4);
    assert.equal(summary.recentSessions[0].executionId, executionId);
    assert.equal(summary.recentSessions[0].lastReplayStatus, "MATCH");

    const replay = await replayRndSavedSession(executionId);
    assert.equal(replay.connected, true);
    assert.equal(replay.status, "MATCH");
    assert.equal(replay.inputMatch, true);
    assert.equal(replay.versionMatch, true);
    assert.equal(replay.outputMatch, true);

    await assert.rejects(
      () => replayRndSavedSession("exec_invalid"),
      /invalid_rnd_execution_id/
    );
    assert.equal(requests.length, 2);
    assert.deepEqual(
      requests.map((request) => [request.method, request.token]),
      [
        ["GET", "session-replay-test-token"],
        ["POST", "session-replay-test-token"],
      ]
    );

    responseMode = "malformed-list";
    const malformedList = await listRndSavedSessions();
    assert.equal(malformedList.connected, false);
    assert.equal(malformedList.availability, "UNAVAILABLE");

    responseMode = "inconsistent-replay";
    const inconsistentReplay = await replayRndSavedSession(executionId);
    assert.equal(inconsistentReplay.connected, false);
    assert.equal(inconsistentReplay.availability, "UNAVAILABLE");

    responseMode = "invalid-json";
    const invalidJson = await listRndSavedSessions();
    assert.equal(invalidJson.connected, false);
    assert.equal(invalidJson.availability, "UNAVAILABLE");

    responseMode = "http-error";
    const httpError = await listRndSavedSessions();
    assert.equal(httpError.connected, false);
    assert.equal(httpError.availability, "UNAVAILABLE");

    responseMode = "timeout";
    const timeout = await listRndSavedSessions();
    assert.equal(timeout.connected, false);
    assert.equal(timeout.availability, "UNAVAILABLE");

    responseMode = "valid";
    process.env.WB_RND_INTERIM_ENABLED = "0";
    const disabled = await listRndSavedSessions();
    assert.equal(disabled.connected, false);
    assert.equal(disabled.availability, "DISABLED");
    assert.equal(disabled.totalSavedSessions, 0);
    assert.equal(requests.length, 9);
    assert.equal(
      requests.filter((request) => request.method === "GET").length,
      7,
      "GET 503 and timeout cases must each include one bounded retry"
    );
  } finally {
    for (const [key, value] of Object.entries({
      WB_RND_INTERIM_ENABLED: original.enabled,
      WB_RND_INTERIM_BASE_URL: original.baseUrl,
      WB_RND_INTERIM_TOKEN: original.token,
      WB_RND_INTERIM_TIMEOUT_MS: original.timeout,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "saved_session_count_contract",
          "replay_result_contract",
          "internal_token_forwarding",
          "invalid_execution_id_rejected",
          "malformed_contract_unavailable",
          "http_error_unavailable",
          "timeout_unavailable",
          "disabled_state_explicit",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
