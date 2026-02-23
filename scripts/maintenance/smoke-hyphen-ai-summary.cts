const {
  enrichNhisPayloadWithAiSummary,
} = require("../../lib/server/hyphen/fetch-ai-summary-core.ts");

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`
    );
  }
}

async function run() {
  process.env.OPENAI_API_KEY = "";

  const payload = {
    ok: true,
    data: {
      normalized: {
        checkup: {
          overview: [
            {
              metric: "혈압(최고/최저)",
              value: "123/75 mmHg",
              checkupDate: "2026. 11. 15",
              normalA: "90~140",
              normalB: "60~90",
            },
            {
              metric: "공복혈당",
              value: "98 mg/dL",
              checkupDate: "2026. 11. 15",
            },
          ],
          summary: {
            overviewCount: 2,
          },
        },
        medication: {
          list: [
            {
              medicine: "예시약",
              date: "2026. 2. 20",
              effect: "복약 유지",
            },
          ],
          summary: {
            totalCount: 1,
          },
        },
      },
    },
  };

  const result = await enrichNhisPayloadWithAiSummary(payload);
  const aiSummary = result?.data?.normalized?.aiSummary;
  assert(aiSummary, "aiSummary should be injected on successful payload");
  assertEqual(aiSummary.source, "fallback", "smoke should default to fallback");
  assert(
    typeof aiSummary.headline === "string" && aiSummary.headline.length > 0,
    "headline should be non-empty"
  );
  assert(
    Array.isArray(aiSummary.highlights) && aiSummary.highlights.length > 0,
    "highlights should include at least one line"
  );

  const failedPayload = {
    ok: false,
    error: "upstream failed",
  };
  const failedResult = await enrichNhisPayloadWithAiSummary(failedPayload);
  assertEqual(
    "aiSummary" in (failedResult.data?.normalized || {}),
    false,
    "failed payload should not be enriched"
  );

  const emptyPayload = {
    ok: true,
    data: {
      normalized: {
        checkup: {
          overview: [],
          summary: { overviewCount: 0 },
        },
        medication: {
          list: [],
          summary: { totalCount: 0 },
        },
      },
    },
  };
  const emptyResult = await enrichNhisPayloadWithAiSummary(emptyPayload);
  const emptySummary = emptyResult?.data?.normalized?.aiSummary;
  assert(emptySummary, "empty payload should still receive fallback summary");
  assertEqual(
    emptySummary.source,
    "fallback",
    "empty payload should use fallback summary"
  );

  console.log("[nhis-ai-summary-smoke] PASS");
}

run().catch((error) => {
  console.error("[nhis-ai-summary-smoke] FAIL", error);
  process.exit(1);
});
