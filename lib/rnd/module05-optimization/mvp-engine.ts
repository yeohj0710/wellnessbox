// RND: Module 05 Optimization Engine MVP deterministic combination ranking.

import {
  RND_MODULE_05_NAME,
  assertRndModule05OptimizationInput,
  assertRndModule05OptimizationOutput,
  assertRndModule05TraceLog,
  type RndModule05ObjectiveWeights,
  type RndModule05OptimizationInput,
  type RndModule05OptimizationOutput,
  type RndModule05TraceLog,
} from "./contracts";
import {
  average,
  assertObjectiveWeights,
  assertPositiveInteger,
  buildBlockedConstraintMap,
  buildComboId,
  buildLimitedIngredientSet,
  buildReasonCodes,
  buildSignalMap,
  clamp01,
  generateCombinations,
  normalizeToken,
  roundTo,
  uniqueSorted,
  type ComboDraft,
  type ExcludedCombo,
} from "./mvp-engine-helpers";

const MODULE05_MVP_PHASE = "MVP" as const;
const DEFAULT_COMBO_SIZE = 2;
const DEFAULT_OBJECTIVE_WEIGHTS: RndModule05ObjectiveWeights = {
  efficacy: 0.6,
  risk: 0.25,
  cost: 0.15,
};

export type Module05MvpRuntimeLog = {
  logId: string;
  caseId: string;
  module: typeof RND_MODULE_05_NAME;
  phase: typeof MODULE05_MVP_PHASE;
  stage:
    | "input_validation"
    | "combination_build"
    | "safety_filter"
    | "ranking"
    | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type RunModule05OptimizationMvpInput = {
  optimizationInput: RndModule05OptimizationInput;
  generatedAt?: string;
  comboSize?: number;
  objectiveWeights?: RndModule05ObjectiveWeights;
};

export type RunModule05OptimizationMvpResult = {
  module: typeof RND_MODULE_05_NAME;
  phase: typeof MODULE05_MVP_PHASE;
  generatedAt: string;
  output: RndModule05OptimizationOutput;
  traceLogs: RndModule05TraceLog[];
  runtimeLogs: Module05MvpRuntimeLog[];
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function runModule05OptimizationMvp(
  input: RunModule05OptimizationMvpInput
): RunModule05OptimizationMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  assertRndModule05OptimizationInput(input.optimizationInput);

  const comboSize = input.comboSize ?? DEFAULT_COMBO_SIZE;
  assertPositiveInteger(comboSize, "comboSize");
  if (comboSize > input.optimizationInput.candidates.length) {
    throw new Error("comboSize cannot exceed candidate count.");
  }

  const objectiveWeights = input.objectiveWeights ?? DEFAULT_OBJECTIVE_WEIGHTS;
  assertObjectiveWeights(objectiveWeights);

  const caseId = input.optimizationInput.caseId;
  const runtimeLogs: Module05MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module05MvpRuntimeLog["stage"],
    event: string,
    details: Module05MvpRuntimeLog["details"]
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m05-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      caseId,
      module: RND_MODULE_05_NAME,
      phase: MODULE05_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: generatedAt,
    });
  };

  const signalMap = buildSignalMap(input.optimizationInput);
  const blockedConstraintMap = buildBlockedConstraintMap(input.optimizationInput);
  const limitedIngredientSet = buildLimitedIngredientSet(input.optimizationInput);
  const preferredIngredientSet = new Set(
    input.optimizationInput.preference.preferredIngredientCodes.map((code) =>
      normalizeToken(code)
    )
  );
  const avoidedIngredientSet = new Set(
    input.optimizationInput.preference.avoidedIngredientCodes.map((code) =>
      normalizeToken(code)
    )
  );

  pushRuntimeLog("input_validation", "validated_inputs", {
    candidateCount: input.optimizationInput.candidates.length,
    efficacySignalCount: input.optimizationInput.efficacySignals.length,
    safetyConstraintCount: input.optimizationInput.safetyConstraints.length,
    comboSize,
    topK: input.optimizationInput.topK,
  });

  const combinations = generateCombinations(input.optimizationInput.candidates, comboSize);
  pushRuntimeLog("combination_build", "generated_combinations", {
    combinationCount: combinations.length,
  });

  const qualifiedCombos: ComboDraft[] = [];
  const excludedSafetyCombos: ExcludedCombo[] = [];
  let excludedByBudget = 0;
  let excludedByDose = 0;

  for (const combo of combinations) {
    const itemIds = combo.map((item) => item.itemId).sort((left, right) =>
      left.localeCompare(right)
    );
    const comboId = buildComboId(itemIds);
    const ingredientCodes = uniqueSorted(combo.flatMap((item) => item.ingredientCodes));
    const ingredientKeys = ingredientCodes.map((code) => normalizeToken(code));

    const blockedIngredientCodes = ingredientCodes.filter((ingredientCode) =>
      blockedConstraintMap.has(normalizeToken(ingredientCode))
    );
    if (blockedIngredientCodes.length > 0) {
      const evidenceConstraintIds = uniqueSorted(
        blockedIngredientCodes.flatMap((ingredientCode) => {
          return blockedConstraintMap.get(normalizeToken(ingredientCode)) ?? [];
        })
      );
      excludedSafetyCombos.push({
        comboId,
        blockedIngredientCodes,
        evidenceConstraintIds,
      });
      continue;
    }

    const monthlyCostKrw = roundTo(
      combo.reduce((sum, item) => sum + item.monthlyCostKrw, 0),
      2
    );
    const dailyDoseCount = combo.reduce((sum, item) => sum + item.dailyDoseCount, 0);

    if (monthlyCostKrw > input.optimizationInput.preference.monthlyBudgetKrw) {
      excludedByBudget += 1;
      continue;
    }
    if (dailyDoseCount > input.optimizationInput.preference.maxDailyDoseCount) {
      excludedByDose += 1;
      continue;
    }

    const signalScores = itemIds.map((itemId) => signalMap.get(itemId)?.score ?? 0);
    const signalIds = itemIds.map((itemId) => {
      const signal = signalMap.get(itemId);
      if (!signal) {
        throw new Error(`Missing efficacy signal for itemId: ${itemId}`);
      }
      return signal.signalId;
    });

    const preferredMatchCount = ingredientKeys.filter((ingredientCode) =>
      preferredIngredientSet.has(ingredientCode)
    ).length;
    const limitMatchCount = ingredientKeys.filter((ingredientCode) =>
      limitedIngredientSet.has(ingredientCode)
    ).length;
    const avoidedMatchCount = ingredientKeys.filter((ingredientCode) =>
      avoidedIngredientSet.has(ingredientCode)
    ).length;

    const efficacyComponent = clamp01(
      average(signalScores) + Math.min(0.12, preferredMatchCount * 0.03)
    );
    const riskComponent = clamp01(
      1 - limitMatchCount * 0.08 - avoidedMatchCount * 0.2
    );

    const budget = input.optimizationInput.preference.monthlyBudgetKrw;
    const costComponent =
      budget > 0
        ? clamp01(1 - monthlyCostKrw / budget)
        : monthlyCostKrw === 0
          ? 1
          : 0;

    const totalScore = clamp01(
      objectiveWeights.efficacy * efficacyComponent +
        objectiveWeights.risk * riskComponent +
        objectiveWeights.cost * costComponent
    );

    qualifiedCombos.push({
      comboId,
      itemIds,
      ingredientCodes,
      monthlyCostKrw,
      dailyDoseCount,
      score: {
        efficacyComponent: roundTo(efficacyComponent, 4),
        riskComponent: roundTo(riskComponent, 4),
        costComponent: roundTo(costComponent, 4),
        totalScore: roundTo(totalScore, 4),
      },
      reasonCodes: buildReasonCodes(
        efficacyComponent,
        monthlyCostKrw,
        dailyDoseCount,
        input.optimizationInput.preference
      ),
      signalIds: uniqueSorted(signalIds),
    });
  }

  pushRuntimeLog("safety_filter", "filtered_combinations", {
    qualifiedCount: qualifiedCombos.length,
    excludedSafetyCount: excludedSafetyCombos.length,
    excludedBudgetCount: excludedByBudget,
    excludedDoseCount: excludedByDose,
  });

  if (qualifiedCombos.length === 0) {
    throw new Error("No qualified combinations remain after constraints.");
  }

  const rankedCombos = [...qualifiedCombos].sort((left, right) => {
    if (right.score.totalScore !== left.score.totalScore) {
      return right.score.totalScore - left.score.totalScore;
    }
    if (right.score.efficacyComponent !== left.score.efficacyComponent) {
      return right.score.efficacyComponent - left.score.efficacyComponent;
    }
    if (left.monthlyCostKrw !== right.monthlyCostKrw) {
      return left.monthlyCostKrw - right.monthlyCostKrw;
    }
    return left.comboId.localeCompare(right.comboId);
  });

  const recommendations = rankedCombos
    .slice(0, input.optimizationInput.topK)
    .map((combo, index) => {
      return {
        rank: index + 1,
        comboId: combo.comboId,
        itemIds: combo.itemIds,
        ingredientCodes: combo.ingredientCodes,
        monthlyCostKrw: combo.monthlyCostKrw,
        dailyDoseCount: combo.dailyDoseCount,
        safetyCompliant: true,
        blockedIngredientCodes: [],
        score: combo.score,
        reasonCodes: combo.reasonCodes,
      };
    });

  if (recommendations.length === 0) {
    throw new Error("No recommendations generated after ranking.");
  }

  pushRuntimeLog("ranking", "ranked_recommendations", {
    rankedComboCount: rankedCombos.length,
    recommendationCount: recommendations.length,
    topScore: recommendations[0].score.totalScore,
  });

  const traceLogs: RndModule05TraceLog[] = [];
  let traceCount = 0;
  const pushTraceLog = (
    comboId: string,
    step: string,
    detail: string,
    evidence: string[]
  ) => {
    traceCount += 1;
    const traceLog: RndModule05TraceLog = {
      traceId: `m05-trace-${String(traceCount).padStart(4, "0")}`,
      caseId,
      comboId,
      step,
      detail,
      evidence: uniqueSorted(evidence),
      loggedAt: generatedAt,
    };
    assertRndModule05TraceLog(traceLog);
    traceLogs.push(traceLog);
  };

  for (const excluded of excludedSafetyCombos) {
    pushTraceLog(
      excluded.comboId,
      "safety-filter",
      `Excluded blocked ingredients: ${excluded.blockedIngredientCodes.join(", ")}.`,
      [
        ...excluded.blockedIngredientCodes.map((ingredient) => `ingredient:${ingredient}`),
        ...excluded.evidenceConstraintIds.map((constraintId) => `constraint:${constraintId}`),
      ]
    );
  }

  for (let index = 0; index < recommendations.length; index += 1) {
    const recommendation = recommendations[index];
    const ranked = rankedCombos[index];
    pushTraceLog(
      recommendation.comboId,
      "ranking",
      `Ranked #${recommendation.rank} with total score ${recommendation.score.totalScore}.`,
      [
        ...ranked.signalIds.map((signalId) => `signal:${signalId}`),
        ...recommendation.reasonCodes.map((reasonCode) => `reason:${reasonCode}`),
      ]
    );
  }

  const output: RndModule05OptimizationOutput = {
    caseId,
    module: RND_MODULE_05_NAME,
    schemaVersion: input.optimizationInput.schemaVersion,
    generatedAt,
    topK: input.optimizationInput.topK,
    objectiveWeights,
    recommendations,
  };
  assertRndModule05OptimizationOutput(output);

  pushRuntimeLog("output_build", "built_output", {
    recommendationCount: output.recommendations.length,
    traceLogCount: traceLogs.length,
    runtimeLogCount: runtimeLogs.length,
  });

  return {
    module: RND_MODULE_05_NAME,
    phase: MODULE05_MVP_PHASE,
    generatedAt,
    output,
    traceLogs,
    runtimeLogs,
  };
}
