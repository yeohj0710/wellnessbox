import assert from "node:assert/strict";

import {
  callWbRndCounselingTurn,
  pseudonymizeInterimSubjectId,
} from "../../lib/server/wb-rnd-interim-client";
import { buildRndCounselingMessageId } from "../../app/api/chat/save/route-service";
import { buildRndCounselingProfile } from "../../app/api/chat/route-service";

async function run() {
  assert.notEqual(
    buildRndCounselingMessageId("session-a", "shared-turn"),
    buildRndCounselingMessageId("session-b", "shared-turn")
  );
  assert.equal(
    buildRndCounselingMessageId("session-a", "shared-turn"),
    buildRndCounselingMessageId("session-a", "shared-turn")
  );
  assert.deepEqual(
    buildRndCounselingProfile(
      {
        age: 41,
        biologicalSex: "female",
        pregnant: false,
        email: "must-not-leave-service@example.com",
        phone: "010-0000-0000",
      },
      ["bone_joint"]
    ),
    {
      age: 41,
      biological_sex: "female",
      pregnant: false,
      goals: ["bone_joint"],
    }
  );
  process.env.WB_RND_INTERIM_ENABLED = "1";
  process.env.WB_RND_INTERIM_BASE_URL = "http://127.0.0.1:8765";
  process.env.WB_RND_INTERIM_TOKEN = "contract-token";
  process.env.WB_RND_INTERIM_PSEUDONYM_SALT = "contract-salt";
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> = {};
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body));
    return Response.json({
      schema_version: "counseling_turn_response_v1",
      service_session_id: "session-1",
      turn_id: "turn-1",
      agent_run_id: "run_123",
      answer: { answer_text: "Verified answer", status: "supported" },
      verification: { passed: true },
      recommendation_execution: {
        run_id: "rec_123",
        status: "READY",
        simulation: true,
      },
      session_binding_sha256: "a".repeat(64),
      deduplicated: false,
    });
  }) as typeof fetch;
  try {
    const result = await callWbRndCounselingTurn({
      service_session_id: "session-1",
      turn_id: "turn-1",
    });
    assert.equal(capturedUrl, "http://127.0.0.1:8765/v1/interim/counseling/turns");
    assert.equal(capturedBody.service_session_id, "session-1");
    assert.equal(result.answer.answer_text, "Verified answer");
    assert.equal(result.recommendation_execution?.run_id, "rec_123");
    assert.match(pseudonymizeInterimSubjectId("member-1"), /^usr_[a-f0-9]{32}$/);
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () =>
    Response.json({
      schema_version: "counseling_turn_response_v1",
      service_session_id: "session-1",
      turn_id: "turn-1",
      agent_run_id: "run_123",
      answer: { answer_text: "Unverified", status: "supported" },
      verification: { passed: false },
      recommendation_execution: null,
      session_binding_sha256: "b".repeat(64),
      deduplicated: false,
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => callWbRndCounselingTurn({}),
      /WB_RND_COUNSELING_invalid_contract/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run();
