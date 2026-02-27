import type {
  RndModule05OptimizationInput,
  RndModule05OptimizationOutput,
  RndModule05TraceLog,
} from "./contracts";
import type { Module05ScaffoldBundle } from "./scaffold.types";

type Module05ScaffoldData = Pick<
  Module05ScaffoldBundle,
  "optimizationInput" | "optimizationOutput" | "traceLogs"
>;

export function buildModule05ScaffoldData(generatedAt: string): Module05ScaffoldData {
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

  return {
    optimizationInput,
    optimizationOutput,
    traceLogs,
  };
}
