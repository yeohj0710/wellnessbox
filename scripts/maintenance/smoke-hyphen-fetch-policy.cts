const {
  dedupeFetchTargets,
  resolveEffectiveYearLimit,
  computeCooldownState,
  isHighCostTargetsEnabled,
  resolveAllowedTargets,
  resolveBlockedTargets,
} = require("../../lib/shared/nhis-fetch-policy.ts");

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (actual=${String(actual)}, expected=${String(expected)})`);
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[], message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} (actual=${actualJson}, expected=${expectedJson})`);
  }
}

function run() {
  const allTargets = [
    "medical",
    "medication",
    "checkupList",
    "checkupYearly",
    "checkupOverview",
    "healthAge",
  ] as const;
  const lowCostTargets = [
    "checkupOverview",
    "medication",
  ] as const;
  const defaultTargets = ["checkupOverview"] as const;
  const detailTargets = ["checkupList", "checkupYearly"] as const;

  const dedupedDefault = dedupeFetchTargets(undefined, defaultTargets);
  assertArrayEqual(
    dedupedDefault,
    ["checkupOverview"],
    "default targets should use low-cost summary target"
  );

  const dedupedTargets = dedupeFetchTargets(
    [
      "checkupOverview",
      "checkupOverview",
      "checkupList",
    ],
    defaultTargets
  );
  assertArrayEqual(
    dedupedTargets,
    ["checkupOverview", "checkupList"],
    "target dedupe should preserve insertion order"
  );

  const summaryYearLimit = resolveEffectiveYearLimit(
    ["checkupOverview"],
    5,
    {
      defaultYearLimit: 1,
      maxYearLimit: 2,
      detailTargets,
    }
  );
  assertEqual(
    summaryYearLimit,
    1,
    "summary-only requests should canonicalize yearLimit to default"
  );

  const detailYearLimitClamped = resolveEffectiveYearLimit(
    ["checkupList", "checkupYearly"],
    999,
    {
      defaultYearLimit: 1,
      maxYearLimit: 2,
      detailTargets,
    }
  );
  assertEqual(
    detailYearLimitClamped,
    2,
    "detail yearLimit should clamp to max guardrail"
  );

  const detailYearLimitMin = resolveEffectiveYearLimit(["checkupList"], 0, {
    defaultYearLimit: 1,
    maxYearLimit: 2,
    detailTargets,
  });
  assertEqual(detailYearLimitMin, 1, "detail yearLimit should clamp to minimum");

  const cooldown = computeCooldownState(
    90,
    new Date("2026-02-21T14:59:30.000Z"),
    new Date("2026-02-21T15:00:00.000Z")
  );
  assertEqual(cooldown.available, false, "cooldown should block within window");
  assertEqual(cooldown.remainingSeconds, 60, "cooldown remaining should be deterministic");

  const highCostDisabled = isHighCostTargetsEnabled(undefined);
  assertEqual(
    highCostDisabled,
    false,
    "high-cost should be disabled when env is absent"
  );
  const allowedDefault = resolveAllowedTargets({
    allTargets,
    lowCostTargets,
    highCostEnabled: highCostDisabled,
  });
  const blockedDefault = resolveBlockedTargets(
    ["checkupOverview", "medical"],
    allowedDefault
  );
  assertArrayEqual(
    blockedDefault,
    ["medical"],
    "high-cost targets should be blocked by default"
  );

  const highCostEnabled = isHighCostTargetsEnabled("1");
  const allowedAll = resolveAllowedTargets({
    allTargets,
    lowCostTargets,
    highCostEnabled,
  });
  const blockedWithFlag = resolveBlockedTargets(
    ["checkupOverview", "medical"],
    allowedAll
  );
  assert(blockedWithFlag.length === 0, "high-cost enable flag should unblock all targets");

  console.log("[nhis-policy-smoke] PASS");
}

try {
  run();
} catch (error) {
  console.error("[nhis-policy-smoke] FAIL", error);
  process.exit(1);
}
