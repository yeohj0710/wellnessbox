// RND: Module 05 Optimization Engine scaffold fixture builder.

import {
  assertRndModule05OptimizationInput,
  assertRndModule05OptimizationOutput,
  assertRndModule05TraceLog,
  type RndModule05OptimizationInput,
  type RndModule05OptimizationOutput,
  type RndModule05TraceLog,
} from "./contracts";

export type Module05ScaffoldBundle = {
  generatedAt: string;
  optimizationInput: RndModule05OptimizationInput;
  optimizationOutput: RndModule05OptimizationOutput;
  traceLogs: RndModule05TraceLog[];
};

function assertIsoDateTime(value: string, fieldName: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function areArraysEqual<T>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function buildModule05ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module05ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const caseId = "rnd05-case-metabolic-001";
  const optimizationInput: RndModule05OptimizationInput = {
    caseId,
    module: "05_optimization_engine",
    schemaVersion: "2026-02-scaffold-v1",
    capturedAt: generatedAt,
    topK: 2,
    profile: {
      appUserIdHash: "sha256:20fa95ef337db99f",
      ageBand: "40-49",
      sex: "male",
      healthGoals: ["metabolic-balance", "sleep-quality"],
      conditions: ["prediabetes"],
      medications: ["warfarin"],
    },
    candidates: [
      {
        itemId: "m05-item-omega3-d",
        productCode: "prod-omega3-d-01",
        ingredientCodes: ["omega3", "vitamin_d"],
        monthlyCostKrw: 42000,
        dailyDoseCount: 2,
      },
      {
        itemId: "m05-item-magnesium",
        productCode: "prod-magnesium-01",
        ingredientCodes: ["magnesium"],
        monthlyCostKrw: 18000,
        dailyDoseCount: 1,
      },
      {
        itemId: "m05-item-probiotic",
        productCode: "prod-probiotic-01",
        ingredientCodes: ["probiotic"],
        monthlyCostKrw: 26000,
        dailyDoseCount: 1,
      },
      {
        itemId: "m05-item-vitamin-k",
        productCode: "prod-vitamin-k-01",
        ingredientCodes: ["vitamin_k"],
        monthlyCostKrw: 15000,
        dailyDoseCount: 1,
      },
    ],
    efficacySignals: [
      {
        signalId: "m05-signal-omega3-d",
        itemId: "m05-item-omega3-d",
        expectedBenefitScore: 0.81,
        confidenceScore: 0.79,
        sourceModelVersion: "module04-v1.0.0",
      },
      {
        signalId: "m05-signal-magnesium",
        itemId: "m05-item-magnesium",
        expectedBenefitScore: 0.74,
        confidenceScore: 0.88,
        sourceModelVersion: "module04-v1.0.0",
      },
      {
        signalId: "m05-signal-probiotic",
        itemId: "m05-item-probiotic",
        expectedBenefitScore: 0.68,
        confidenceScore: 0.72,
        sourceModelVersion: "module04-v1.0.0",
      },
      {
        signalId: "m05-signal-vitamin-k",
        itemId: "m05-item-vitamin-k",
        expectedBenefitScore: 0.65,
        confidenceScore: 0.66,
        sourceModelVersion: "module04-v1.0.0",
      },
    ],
    safetyConstraints: [
      {
        constraintId: "m05-constraint-vitamin-k-block",
        ingredientCode: "vitamin_k",
        decision: "block",
        maxDailyIntakeMg: null,
        reason: "Blocked due to interaction risk with active warfarin medication.",
        sourceRuleIds: ["m03-rule-vitk-warfarin"],
      },
      {
        constraintId: "m05-constraint-magnesium-limit",
        ingredientCode: "magnesium",
        decision: "limit",
        maxDailyIntakeMg: 350,
        reason: "Daily magnesium intake must remain at or below 350mg/day.",
        sourceRuleIds: ["m03-rule-magnesium-max"],
      },
      {
        constraintId: "m05-constraint-omega3-allow",
        ingredientCode: "omega3",
        decision: "allow",
        maxDailyIntakeMg: 2000,
        reason: "Omega-3 is allowed within the configured intake range.",
        sourceRuleIds: ["m03-rule-omega3-allow"],
      },
    ],
    preference: {
      monthlyBudgetKrw: 70000,
      maxDailyDoseCount: 3,
      preferredIngredientCodes: ["omega3", "magnesium"],
      avoidedIngredientCodes: ["vitamin_k"],
    },
  };

  const optimizationOutput: RndModule05OptimizationOutput = {
    caseId,
    module: "05_optimization_engine",
    schemaVersion: "2026-02-scaffold-v1",
    generatedAt,
    topK: 2,
    objectiveWeights: {
      efficacy: 0.6,
      risk: 0.25,
      cost: 0.15,
    },
    recommendations: [
      {
        rank: 1,
        comboId: "m05-combo-omega3-magnesium",
        itemIds: ["m05-item-omega3-d", "m05-item-magnesium"],
        ingredientCodes: ["omega3", "vitamin_d", "magnesium"],
        monthlyCostKrw: 60000,
        dailyDoseCount: 3,
        safetyCompliant: true,
        blockedIngredientCodes: [],
        score: {
          efficacyComponent: 0.86,
          riskComponent: 0.92,
          costComponent: 0.78,
          totalScore: 0.863,
        },
        reasonCodes: [
          "goal_match",
          "safety_compliant",
          "efficacy_priority",
          "budget_fit",
          "dose_convenience",
        ],
      },
      {
        rank: 2,
        comboId: "m05-combo-omega3-probiotic",
        itemIds: ["m05-item-omega3-d", "m05-item-probiotic"],
        ingredientCodes: ["omega3", "vitamin_d", "probiotic"],
        monthlyCostKrw: 68000,
        dailyDoseCount: 3,
        safetyCompliant: true,
        blockedIngredientCodes: [],
        score: {
          efficacyComponent: 0.81,
          riskComponent: 0.96,
          costComponent: 0.72,
          totalScore: 0.834,
        },
        reasonCodes: ["goal_match", "safety_compliant", "budget_fit", "dose_convenience"],
      },
    ],
  };

  const traceLogs: RndModule05TraceLog[] = [
    {
      traceId: "m05-trace-filter-vitamin-k",
      caseId,
      comboId: "m05-combo-omega3-magnesium",
      step: "safety-filter",
      detail: "Candidates containing vitamin_k were excluded from ranking.",
      evidence: ["m05-constraint-vitamin-k-block", "m03-rule-vitk-warfarin"],
      loggedAt: generatedAt,
    },
    {
      traceId: "m05-trace-rank-001",
      caseId,
      comboId: "m05-combo-omega3-magnesium",
      step: "ranking",
      detail: "Highest weighted score after applying efficacy/risk/cost objectives.",
      evidence: ["m05-signal-omega3-d", "m05-signal-magnesium"],
      loggedAt: generatedAt,
    },
    {
      traceId: "m05-trace-rank-002",
      caseId,
      comboId: "m05-combo-omega3-probiotic",
      step: "ranking",
      detail: "Selected as a budget-fit alternative with lower efficacy component.",
      evidence: ["m05-signal-omega3-d", "m05-signal-probiotic"],
      loggedAt: generatedAt,
    },
  ];

  const bundle: Module05ScaffoldBundle = {
    generatedAt,
    optimizationInput,
    optimizationOutput,
    traceLogs,
  };
  assertModule05ScaffoldBundle(bundle);
  return bundle;
}

export function assertModule05ScaffoldBundle(bundle: Module05ScaffoldBundle): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");
  assertRndModule05OptimizationInput(bundle.optimizationInput);
  assertRndModule05OptimizationOutput(bundle.optimizationOutput);

  if (bundle.traceLogs.length === 0) {
    throw new Error("At least one Module 05 trace log is required.");
  }
  bundle.traceLogs.forEach((traceLog) => assertRndModule05TraceLog(traceLog));

  if (bundle.optimizationInput.caseId !== bundle.optimizationOutput.caseId) {
    throw new Error("Module 05 caseId mismatch between input and output.");
  }
  if (bundle.optimizationInput.caseId !== bundle.traceLogs[0]?.caseId) {
    throw new Error("Module 05 trace logs must use the same caseId as input.");
  }
  bundle.traceLogs.forEach((traceLog) => {
    if (traceLog.caseId !== bundle.optimizationInput.caseId) {
      throw new Error(`Trace ${traceLog.traceId} has mismatched caseId.`);
    }
  });

  if (bundle.optimizationOutput.generatedAt !== bundle.generatedAt) {
    throw new Error("Module 05 bundle generatedAt must match output generatedAt.");
  }

  if (bundle.optimizationInput.topK !== bundle.optimizationOutput.topK) {
    throw new Error("Module 05 topK mismatch between input and output.");
  }

  const candidateIdSet = new Set(
    bundle.optimizationInput.candidates.map((candidate) => candidate.itemId)
  );
  if (candidateIdSet.size !== bundle.optimizationInput.candidates.length) {
    throw new Error("Module 05 candidates must be unique by itemId.");
  }

  const signalIdSet = new Set(
    bundle.optimizationInput.efficacySignals.map((signal) => signal.signalId)
  );
  if (signalIdSet.size !== bundle.optimizationInput.efficacySignals.length) {
    throw new Error("Module 05 efficacy signals must be unique by signalId.");
  }
  const signalItemIdSet = new Set(
    bundle.optimizationInput.efficacySignals.map((signal) => signal.itemId)
  );
  if (signalItemIdSet.size !== bundle.optimizationInput.candidates.length) {
    throw new Error("Module 05 scaffold requires one efficacy signal per candidate item.");
  }
  signalItemIdSet.forEach((itemId) => {
    if (!candidateIdSet.has(itemId)) {
      throw new Error(`Missing candidate item ${itemId} referenced by efficacy signal.`);
    }
  });

  const blockedIngredientSet = new Set(
    bundle.optimizationInput.safetyConstraints
      .filter((constraint) => constraint.decision === "block")
      .map((constraint) => constraint.ingredientCode)
  );

  const recommendationComboIdSet = new Set(
    bundle.optimizationOutput.recommendations.map((recommendation) => recommendation.comboId)
  );
  if (recommendationComboIdSet.size !== bundle.optimizationOutput.recommendations.length) {
    throw new Error("Module 05 recommendations must be unique by comboId.");
  }

  const sortedRanks = [...bundle.optimizationOutput.recommendations]
    .map((recommendation) => recommendation.rank)
    .sort((left, right) => left - right);
  const expectedRanks = Array.from(
    { length: bundle.optimizationOutput.recommendations.length },
    (_, index) => index + 1
  );
  if (!areArraysEqual(sortedRanks, expectedRanks)) {
    throw new Error("Module 05 recommendation ranks must be contiguous starting at 1.");
  }

  const scoreByRank = [...bundle.optimizationOutput.recommendations]
    .sort((left, right) => left.rank - right.rank)
    .map((recommendation) => recommendation.score.totalScore);
  for (let index = 1; index < scoreByRank.length; index += 1) {
    if (scoreByRank[index] > scoreByRank[index - 1]) {
      throw new Error("Module 05 recommendations must be sorted by descending totalScore.");
    }
  }

  const candidateById = new Map(
    bundle.optimizationInput.candidates.map((candidate) => [candidate.itemId, candidate])
  );

  bundle.optimizationOutput.recommendations.forEach((recommendation) => {
    const dedupedItemIds = sortedUnique(recommendation.itemIds);
    if (dedupedItemIds.length !== recommendation.itemIds.length) {
      throw new Error(`Duplicate itemIds found in recommendation ${recommendation.comboId}.`);
    }
    let monthlyCostKrw = 0;
    let dailyDoseCount = 0;
    const ingredientCodes: string[] = [];

    recommendation.itemIds.forEach((itemId) => {
      const candidate = candidateById.get(itemId);
      if (!candidate) {
        throw new Error(
          `Recommendation ${recommendation.comboId} references unknown itemId ${itemId}.`
        );
      }
      monthlyCostKrw += candidate.monthlyCostKrw;
      dailyDoseCount += candidate.dailyDoseCount;
      ingredientCodes.push(...candidate.ingredientCodes);
    });

    const expectedIngredientCodes = sortedUnique(ingredientCodes);
    const actualIngredientCodes = sortedUnique(recommendation.ingredientCodes);
    if (!areArraysEqual(actualIngredientCodes, expectedIngredientCodes)) {
      throw new Error(
        `Recommendation ${recommendation.comboId} has ingredientCodes mismatch with itemIds.`
      );
    }

    if (Math.abs(recommendation.monthlyCostKrw - monthlyCostKrw) > 1e-6) {
      throw new Error(`Recommendation ${recommendation.comboId} has monthlyCostKrw mismatch.`);
    }
    if (recommendation.dailyDoseCount !== dailyDoseCount) {
      throw new Error(`Recommendation ${recommendation.comboId} has dailyDoseCount mismatch.`);
    }

    if (
      recommendation.monthlyCostKrw >
      bundle.optimizationInput.preference.monthlyBudgetKrw
    ) {
      throw new Error(
        `Recommendation ${recommendation.comboId} exceeds configured monthly budget.`
      );
    }
    if (
      recommendation.dailyDoseCount >
      bundle.optimizationInput.preference.maxDailyDoseCount
    ) {
      throw new Error(
        `Recommendation ${recommendation.comboId} exceeds configured maxDailyDoseCount.`
      );
    }

    const blockedInRecommendation = actualIngredientCodes.filter((ingredientCode) =>
      blockedIngredientSet.has(ingredientCode)
    );
    if (blockedInRecommendation.length > 0) {
      throw new Error(
        `Recommendation ${recommendation.comboId} includes blocked ingredients: ${blockedInRecommendation.join(", ")}.`
      );
    }
  });

  bundle.traceLogs.forEach((traceLog) => {
    if (!recommendationComboIdSet.has(traceLog.comboId)) {
      throw new Error(`Trace ${traceLog.traceId} references unknown comboId.`);
    }
  });
}
