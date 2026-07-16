import assert from "node:assert/strict";

import {
  WB_RND_RECOMMEND_PREVIEW_SAMPLE,
  callWbRndRecommendPreview,
  isWbRndRecommendPreviewEnabled,
  resolveWbRndRecommendTimeoutMs,
} from "../../lib/server/wb-rnd-client";

function buildValidBlockedResponse(recommendations: unknown[] = []) {
  return {
    execution_id: `exec_${"1".repeat(32)}`,
    request_id: "contract-blocked-001",
    decision_id: "decision-blocked-001",
    status: "blocked",
    decision_summary: {
      headline: "blocked",
      summary: "blocked by safety",
      confidence_band: "low",
    },
    normalized_focus_goals: ["heart_health"],
    safety_summary: {
      applied_at: "2026-07-16T00:00:00Z",
      status: "blocked",
      warnings: [],
      blocked_reasons: ["urgent safety signal"],
      excluded_ingredients: [],
      rule_refs: [],
      duplicate_ingredient_keys: [],
      ingredient_dose_aggregates: [],
    },
    safety_flags: ["urgent safety signal"],
    safety_evidence: [],
    recommendations,
    next_action: "trigger_safety_recheck",
    next_action_rationale: {
      reason_code: "structured_safety_blocker",
      summary: "safety block",
      supporting_codes: ["SAFETY-URGENT-SYMPTOM-001"],
    },
    follow_up_window_days: 21,
    follow_up_questions: [],
    missing_information: [],
    limitations: [],
    limitation_details: [],
    metadata: {
      engine_version: "contract-test",
      mode: "deterministic_baseline_v1",
      generated_at: "2026-07-16T00:00:00Z",
    },
  };
}

function assertFailClosed(
  result: Awaited<ReturnType<typeof callWbRndRecommendPreview>>,
  expectedReason: string
) {
  assert.equal(result.source, "fallback");
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, expectedReason);
  assert.equal(result.safetyAuthority.final, true);
  assert.equal(result.safetyAuthority.mode, "service_fail_closed");
  assert.equal(result.safetyAuthority.reason, expectedReason);
  assert.equal((result.response as { status: string }).status, "blocked");
  assert.equal(
    (result.response as { safety_summary: { status: string } }).safety_summary
      .status,
    "blocked"
  );
  assert.deepEqual(
    (result.response as { recommendations: unknown[] }).recommendations,
    []
  );
}

async function run() {
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    WB_RND_PREVIEW_ENABLED: process.env.WB_RND_PREVIEW_ENABLED,
    WB_RND_RECOMMEND_ENABLED: process.env.WB_RND_RECOMMEND_ENABLED,
    WB_RND_RECOMMEND_TIMEOUT_MS: process.env.WB_RND_RECOMMEND_TIMEOUT_MS,
    WB_RND_SERVICE_BASE_URL: process.env.WB_RND_SERVICE_BASE_URL,
  };

  try {
    process.env.NODE_ENV = "development";
    process.env.WB_RND_PREVIEW_ENABLED = "1";
    process.env.WB_RND_RECOMMEND_ENABLED = "0";
    process.env.WB_RND_RECOMMEND_TIMEOUT_MS = "2500";
    process.env.WB_RND_SERVICE_BASE_URL = "http://127.0.0.1:8000";

    assert.equal(
      isWbRndRecommendPreviewEnabled(),
      true,
      "preview flag should enable the dev preview route"
    );
    assert.equal(
      resolveWbRndRecommendTimeoutMs(),
      2500,
      "timeout env should be respected"
    );

    let forwardedBody: Record<string, unknown> = {};
    const remoteResult = await callWbRndRecommendPreview(
      {
        ...WB_RND_RECOMMEND_PREVIEW_SAMPLE,
        allergies: ["fish"],
        risk_flags: ["red_flag_chest_pain"],
      },
      {
        fetchImpl: async (_input, init) => {
          forwardedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(JSON.stringify(buildValidBlockedResponse()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      }
    );

    assert.equal(remoteResult.source, "rnd");
    assert.equal(remoteResult.safetyAuthority.mode, "rnd_final");
    assert.equal(remoteResult.safetyAuthority.final, true);
    assert.equal(
      (remoteResult.response as { status: string }).status,
      "blocked"
    );
    assert.deepEqual(forwardedBody?.allergies, ["fish"]);
    assert.deepEqual(forwardedBody?.risk_flags, ["red_flag_chest_pain"]);

    const fallbackResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () => {
          throw new Error("simulated upstream offline");
        },
      }
    );

    assertFailClosed(fallbackResult, "network_error");
    assert.ok(
      JSON.stringify(fallbackResult.response).includes("preview_fallback"),
      "fallback response should expose preview_fallback rule"
    );

    const inconsistentResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify(buildValidBlockedResponse([{ ingredient_key: "unsafe" }])),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          ),
      }
    );
    assertFailClosed(inconsistentResult, "invalid_upstream_contract");

    const disagreeingStatusResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () => {
          const response = buildValidBlockedResponse();
          response.status = "needs_review";
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      }
    );
    assertFailClosed(disagreeingStatusResult, "invalid_upstream_contract");

    const decodeResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () =>
          new Response("not-json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      }
    );
    assertFailClosed(decodeResult, "decode_error");

    const httpResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () =>
          new Response(JSON.stringify({ detail: "unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
      }
    );
    assertFailClosed(httpResult, "upstream_503");

    process.env.WB_RND_RECOMMEND_TIMEOUT_MS = "500";
    const timeoutResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      }
    );
    assertFailClosed(timeoutResult, "timeout");

    process.env.WB_RND_SERVICE_BASE_URL = "";
    const missingConfigurationResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE
    );
    assertFailClosed(missingConfigurationResult, "service_base_url_missing");
    process.env.WB_RND_SERVICE_BASE_URL = "http://127.0.0.1:8000";

    process.env.WB_RND_PREVIEW_ENABLED = "0";
    assert.equal(
      isWbRndRecommendPreviewEnabled(),
      false,
      "preview should be disabled when the dedicated flag is off"
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: [
            "preview_flag_gate",
            "timeout_env_resolution",
            "structured_safety_input_forwarding",
            "valid_rnd_block_preserved",
            "fallback_response_on_network_error",
            "inconsistent_upstream_response_blocked",
            "disagreeing_safety_status_blocked",
            "decode_error_blocked",
            "http_error_blocked",
            "timeout_blocked",
            "missing_configuration_blocked",
          ],
        },
        null,
        2
      )
    );
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

void run();
