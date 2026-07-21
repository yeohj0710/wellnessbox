import assert from "node:assert/strict";

import {
  callWbRndCounselingTurn,
  pseudonymizeInterimSubjectId,
} from "../../lib/server/wb-rnd-interim-client";

async function run() {
  const response = await callWbRndCounselingTurn({
    schema_version: "counseling_turn_request_v1",
    service_session_id: "op088-live-session",
    turn_id: "op088-live-turn",
    profile_id: pseudonymizeInterimSubjectId("op088-live-subject"),
    query: "What should counseling say about glucosamine with warfarin?",
    answered_at: "2026-07-21T12:00:00Z",
    profile: { age: 41, goals: ["bone_joint"], pregnant: true },
    consent_scopes: ["counseling:write", "recommendation:write"],
    goals: ["bone_joint"],
    ingredients: ["glucosamine"],
    safety: { pregnant: true },
  });
  assert.equal(response.service_session_id, "op088-live-session");
  assert.equal(response.turn_id, "op088-live-turn");
  assert.equal(response.verification.passed, true);
  assert.equal(response.answer.status, "supported");
  assert.ok(response.recommendation_execution?.run_id);
  assert.equal(response.recommendation_execution?.status, "BLOCKED");
  console.log(JSON.stringify(response));
}

void run();
