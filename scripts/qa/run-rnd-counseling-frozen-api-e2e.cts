import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  callWbRndCounselingTurn,
  pseudonymizeInterimSubjectId,
} from "../../lib/server/wb-rnd-interim-client";

type FrozenCase = {
  case_id: string;
  question_type: string;
  query: string;
  expected_status: string;
  expected_chunk_ids: string[];
};

type FrozenDataset = {
  schema_version: "op089_op090_counseling_frozen_qa_v1";
  frozen_at: string;
  case_count: number;
  cases: FrozenCase[];
};

async function executeCase(item: FrozenCase, frozenAt: string) {
  const response = await callWbRndCounselingTurn({
    schema_version: "counseling_turn_request_v1",
    service_session_id: `op090-${item.case_id}`,
    turn_id: `turn-${item.case_id}`,
    profile_id: pseudonymizeInterimSubjectId(`subject-${item.case_id}`),
    query: item.query,
    answered_at: frozenAt,
    profile: { goals: ["general_wellness"] },
    consent_scopes: ["simulation:write", "counseling:external-provider"],
    goals: ["general_wellness"],
    ingredients: [],
    safety: { requires_test: true },
  });
  assert.equal(response.answer.status, item.expected_status);
  assert.deepEqual(response.answer.used_chunk_ids, item.expected_chunk_ids);
  assert.equal(response.verification.passed, true);
  if (item.expected_status === "safety_escalation") {
    assert.equal(response.answer_execution.fallback_reason, "urgent_safety_precedence");
    assert.equal(response.answer_execution.attempted_live_call, false);
    assert.equal(response.recommendation_execution, null);
  } else {
    assert.equal(response.answer_execution.provider, "deterministic_template_fallback");
    assert.equal(response.answer_execution.fallback_reason, "openai_call_failed");
    assert.equal(response.answer_execution.attempted_live_call, true);
    assert.equal(response.answer_execution.live_failure?.failure_stage, "http_request");
    assert.equal(response.answer_execution.live_failure?.status_code, 503);
    assert.equal(response.recommendation_execution?.status, "BLOCKED");
  }
  return response;
}

async function run() {
  const datasetPath = process.env.WB_RND_COUNSELING_QA_DATASET;
  assert.ok(datasetPath, "WB_RND_COUNSELING_QA_DATASET is required");
  const dataset = JSON.parse(await readFile(datasetPath, "utf8")) as FrozenDataset;
  assert.equal(dataset.schema_version, "op089_op090_counseling_frozen_qa_v1");
  assert.equal(dataset.case_count, dataset.cases.length);
  assert.equal(new Set(dataset.cases.map((item) => item.case_id)).size, dataset.case_count);

  const first = [];
  const repeated = [];
  for (const item of dataset.cases) first.push(await executeCase(item, dataset.frozen_at));
  for (const item of dataset.cases) repeated.push(await executeCase(item, dataset.frozen_at));
  for (let index = 0; index < dataset.case_count; index += 1) {
    assert.equal(first[index].deduplicated, false);
    assert.equal(repeated[index].deduplicated, true);
    assert.deepEqual(repeated[index].answer, first[index].answer);
    assert.deepEqual(repeated[index].answer_execution, first[index].answer_execution);
    assert.equal(repeated[index].session_binding_sha256, first[index].session_binding_sha256);
  }
  console.log(JSON.stringify({ first, repeated }));
}

void run();
