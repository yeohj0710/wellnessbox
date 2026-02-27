import {
  assertRndModule05OptimizationInput,
  assertRndModule05OptimizationOutput,
  assertRndModule05TraceLog,
} from "./contracts";
import type { Module05ScaffoldBundle } from "./scaffold.types";

export function assertIsoDateTime(value: string, fieldName: string) {
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
