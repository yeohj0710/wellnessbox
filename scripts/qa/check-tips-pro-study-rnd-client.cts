import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { enrollProPlan, saveProFollowup } from "../../lib/tips/pro-study-rnd-client";

async function run() {
  const component = await readFile("components/tips/ProStudySimulation.tsx", "utf8");
  assert.match(component, /import \{ enrollProPlan, saveProFollowup \}/);
  assert.match(component, /await enrollProPlan\(/);
  assert.match(component, /await saveProFollowup\(/);
  assert.match(component, /mode: "live"/);
  assert.match(component, /mode: "simulation"/);
  assert.match(component, /PRO 결과를 저장하지 못했습니다\. 잠시 후 다시 시도하세요\./);

  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input);
    calls.push({ path, body: JSON.parse(String(init?.body)) });
    if (path.endsWith("/plans")) {
      return Response.json({
        execution_id: `exec_${"1".repeat(32)}`,
        plan_id: "plan_runtime_001",
        baseline_event_id: `event_${"2".repeat(32)}`,
        baseline: { instrument_scores: [{ raw_score: 14 }] },
        recommendation: { recommendations: [{ ingredient_key: "magnesium_glycinate" }] },
      });
    }
    return Response.json({
      operation: "created",
      event_id: `event_${"3".repeat(32)}`,
      raw_score: 7,
      interpretation: { mean_health_z_change: 1.2 },
      lineage: { plan_id: "plan_runtime_001" },
    });
  }) as typeof fetch;
  try {
    const enrolled = await enrollProPlan({
      profile: { age: 41, sex: "other", goals: ["sleep quality"] },
      baseline: { instrument: "PSQI", responses: [2, 2, 2, 2, 2, 2, 2] },
      observedAt: "2026-01-01T00:00:00Z",
      consentAccepted: true,
    });
    const followed = await saveProFollowup({
      executionId: enrolled.executionId,
      planId: enrolled.planId,
      timepoint: "week_2",
      answers: { instrument: "PSQI", responses: [1, 1, 1, 1, 1, 1, 1] },
      observedAt: "2026-01-15T00:00:00Z",
      actualDayIndex: 14,
      plannedDoseCount: 14,
      takenDoseCount: 13,
      adverseEvents: [],
    });
    assert.equal(calls[0].path, "/api/tips/pro/plans");
    assert.equal(calls[1].path, "/api/tips/pro/effects");
    assert.equal(enrolled.rawScore, 14);
    assert.equal(followed.rawScore, 7);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run();
