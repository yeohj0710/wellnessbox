// RND: Module 05 KPI #1 recommendation-accuracy evaluation helpers.

export const MODULE05_RECOMMENDATION_ACCURACY_MIN_CASE_COUNT = 100;
export const MODULE05_RECOMMENDATION_ACCURACY_TARGET_PERCENT = 80;

export type Module05RecommendationAccuracySample = {
  sampleId: string;
  caseId: string;
  expectedIngredientCodes: string[];
  observedIngredientCodes: string[];
  topRecommendation: {
    comboId: string;
    itemIds: string[];
  };
};

export type Module05RecommendationAccuracyCaseResult = {
  sampleId: string;
  caseId: string;
  expectedIngredientCount: number;
  observedIngredientCount: number;
  overlapIngredientCount: number;
  scorePercent: number;
  missingIngredientCodes: string[];
  extraIngredientCodes: string[];
  topRecommendationComboId: string;
  interventionLinkReady: boolean;
};

export type Module05RecommendationAccuracyEvaluationReport = {
  module: "05_optimization_engine";
  phase: "EVALUATION";
  kpiId: "kpi-01";
  formula: "s_i = 100 * |R_i ∩ Γ_i| / |R_i|; Score = (1/N) * sum(s_i)";
  evaluatedAt: string;
  caseCount: number;
  meanScorePercent: number;
  targetPercent: number;
  minCaseCount: number;
  targetSatisfied: boolean;
  minCaseCountSatisfied: boolean;
  interventionLinkReadyCaseCount: number;
  interventionLinkReadinessPercent: number;
  caseResults: Module05RecommendationAccuracyCaseResult[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function normalizeIngredientCodes(values: string[]): string[] {
  return uniqueSorted(
    values
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function assertSample(sample: Module05RecommendationAccuracySample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.caseId)) {
    throw new Error(`${location}.caseId must be a non-empty string.`);
  }
  if (
    !Array.isArray(sample.expectedIngredientCodes) ||
    sample.expectedIngredientCodes.length === 0
  ) {
    throw new Error(
      `${location}.expectedIngredientCodes must include at least one ingredient code.`
    );
  }
  if (
    !Array.isArray(sample.observedIngredientCodes) ||
    sample.observedIngredientCodes.length === 0
  ) {
    throw new Error(
      `${location}.observedIngredientCodes must include at least one ingredient code.`
    );
  }
  if (!sample.expectedIngredientCodes.every((value) => isNonEmptyString(value))) {
    throw new Error(
      `${location}.expectedIngredientCodes must contain non-empty strings.`
    );
  }
  if (!sample.observedIngredientCodes.every((value) => isNonEmptyString(value))) {
    throw new Error(
      `${location}.observedIngredientCodes must contain non-empty strings.`
    );
  }
  if (!isNonEmptyString(sample.topRecommendation.comboId)) {
    throw new Error(`${location}.topRecommendation.comboId must be a non-empty string.`);
  }
  if (
    !Array.isArray(sample.topRecommendation.itemIds) ||
    sample.topRecommendation.itemIds.length === 0
  ) {
    throw new Error(
      `${location}.topRecommendation.itemIds must include at least one item ID.`
    );
  }
  if (!sample.topRecommendation.itemIds.every((value) => isNonEmptyString(value))) {
    throw new Error(
      `${location}.topRecommendation.itemIds must contain non-empty strings.`
    );
  }
}

export function evaluateModule05RecommendationAccuracy(
  samples: Module05RecommendationAccuracySample[],
  evaluatedAt = new Date().toISOString()
): Module05RecommendationAccuracyEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 05 evaluation requires at least one case sample.");
  }
  if (!Number.isFinite(Date.parse(evaluatedAt))) {
    throw new Error("evaluatedAt must be a valid ISO datetime string.");
  }

  const caseResults = samples.map((sample, index) => {
    assertSample(sample, index);

    const expected = normalizeIngredientCodes(sample.expectedIngredientCodes);
    const observed = normalizeIngredientCodes(sample.observedIngredientCodes);
    const expectedSet = new Set(expected);
    const observedSet = new Set(observed);

    const overlap = expected.filter((ingredientCode) =>
      observedSet.has(ingredientCode)
    );
    const missing = expected.filter((ingredientCode) => !observedSet.has(ingredientCode));
    const extra = observed.filter((ingredientCode) => !expectedSet.has(ingredientCode));

    const scorePercent = roundTo((overlap.length / expected.length) * 100, 2);
    const interventionLinkReady =
      isNonEmptyString(sample.topRecommendation.comboId) &&
      sample.topRecommendation.itemIds.length > 0;

    return {
      sampleId: sample.sampleId,
      caseId: sample.caseId,
      expectedIngredientCount: expected.length,
      observedIngredientCount: observed.length,
      overlapIngredientCount: overlap.length,
      scorePercent,
      missingIngredientCodes: missing,
      extraIngredientCodes: extra,
      topRecommendationComboId: sample.topRecommendation.comboId,
      interventionLinkReady,
    };
  });

  const meanScorePercent = roundTo(
    average(caseResults.map((result) => result.scorePercent)),
    2
  );
  const interventionLinkReadyCaseCount = caseResults.filter(
    (result) => result.interventionLinkReady
  ).length;
  const interventionLinkReadinessPercent = roundTo(
    (interventionLinkReadyCaseCount / caseResults.length) * 100,
    2
  );
  const minCaseCountSatisfied =
    caseResults.length >= MODULE05_RECOMMENDATION_ACCURACY_MIN_CASE_COUNT;
  const targetSatisfied =
    meanScorePercent >= MODULE05_RECOMMENDATION_ACCURACY_TARGET_PERCENT;

  return {
    module: "05_optimization_engine",
    phase: "EVALUATION",
    kpiId: "kpi-01",
    formula: "s_i = 100 * |R_i ∩ Γ_i| / |R_i|; Score = (1/N) * sum(s_i)",
    evaluatedAt,
    caseCount: caseResults.length,
    meanScorePercent,
    targetPercent: MODULE05_RECOMMENDATION_ACCURACY_TARGET_PERCENT,
    minCaseCount: MODULE05_RECOMMENDATION_ACCURACY_MIN_CASE_COUNT,
    targetSatisfied,
    minCaseCountSatisfied,
    interventionLinkReadyCaseCount,
    interventionLinkReadinessPercent,
    caseResults,
  };
}
