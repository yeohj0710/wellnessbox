import assert from "node:assert/strict";

import {
  WB_RND_RECOMMEND_PREVIEW_SAMPLE,
  callWbRndRecommendPreview,
  isWbRndRecommendPreviewEnabled,
  resolveWbRndRecommendTimeoutMs,
} from "../../lib/server/wb-rnd-client";

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

    const fallbackResult = await callWbRndRecommendPreview(
      WB_RND_RECOMMEND_PREVIEW_SAMPLE,
      {
        fetchImpl: async () => {
          throw new Error("simulated upstream offline");
        },
      }
    );

    assert.equal(fallbackResult.ok, true);
    assert.equal(fallbackResult.enabled, true);
    assert.equal(fallbackResult.source, "fallback");
    assert.equal(fallbackResult.usedFallback, true);
    assert.equal(fallbackResult.fallbackReason, "network_error");
    assert.ok(
      JSON.stringify(fallbackResult.response).includes("preview_fallback"),
      "fallback response should expose preview_fallback rule"
    );

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
            "fallback_response_on_network_error",
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
