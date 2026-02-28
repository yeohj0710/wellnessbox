// RND: Module 04 KPI #2 efficacy-improvement (pp) evaluation helpers.

export const MODULE04_IMPROVEMENT_TARGET_PP = 0;
export const MODULE04_IMPROVEMENT_MIN_CASE_COUNT = 100;

export type Module04ImprovementSample = {
  sampleId: string;
  evaluationId: string;
  appUserIdHash: string;
  preZScore: number;
  postZScore: number;
};

export type Module04ImprovementCaseResult = {
  sampleId: string;
  evaluationId: string;
  appUserIdHash: string;
  preZScore: number;
  postZScore: number;
  deltaZScore: number;
  improvementPp: number;
};

export type Module04ImprovementEvaluationReport = {
  module: "04_efficacy_quantification_model";
  phase: "EVALUATION";
  kpiId: "kpi-02";
  formula: "p_i = 100 * (Phi(z_post_i) - Phi(z_pre_i)); SCGI = (1/N) * sum(p_i)";
  evaluatedAt: string;
  caseCount: number;
  minCaseCount: number;
  minCaseCountSatisfied: boolean;
  scgiPp: number;
  meanDeltaZScore: number;
  targetPpThreshold: number;
  targetSatisfied: boolean;
  caseResults: Module04ImprovementCaseResult[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function erfApprox(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-(x * x));
  return sign * y;
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

function assertSample(sample: Module04ImprovementSample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.evaluationId)) {
    throw new Error(`${location}.evaluationId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.appUserIdHash)) {
    throw new Error(`${location}.appUserIdHash must be a non-empty string.`);
  }
  if (!isFiniteNumber(sample.preZScore)) {
    throw new Error(`${location}.preZScore must be a finite number.`);
  }
  if (!isFiniteNumber(sample.postZScore)) {
    throw new Error(`${location}.postZScore must be a finite number.`);
  }
}

export function evaluateModule04ImprovementPp(
  samples: Module04ImprovementSample[],
  evaluatedAt = new Date().toISOString()
): Module04ImprovementEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 04 evaluation requires at least one included user sample.");
  }
  if (!Number.isFinite(Date.parse(evaluatedAt))) {
    throw new Error("evaluatedAt must be a valid ISO datetime string.");
  }

  const caseResults = samples.map((sample, index) => {
    assertSample(sample, index);
    const deltaZScore = sample.postZScore - sample.preZScore;
    const improvementPp =
      (normalCdf(sample.postZScore) - normalCdf(sample.preZScore)) * 100;
    return {
      sampleId: sample.sampleId,
      evaluationId: sample.evaluationId,
      appUserIdHash: sample.appUserIdHash,
      preZScore: roundTo(sample.preZScore, 4),
      postZScore: roundTo(sample.postZScore, 4),
      deltaZScore: roundTo(deltaZScore, 4),
      improvementPp: roundTo(improvementPp, 4),
    };
  });

  const scgiPp = roundTo(
    average(caseResults.map((result) => result.improvementPp)),
    4
  );
  const meanDeltaZScore = roundTo(
    average(caseResults.map((result) => result.deltaZScore)),
    4
  );

  return {
    module: "04_efficacy_quantification_model",
    phase: "EVALUATION",
    kpiId: "kpi-02",
    formula: "p_i = 100 * (Phi(z_post_i) - Phi(z_pre_i)); SCGI = (1/N) * sum(p_i)",
    evaluatedAt,
    caseCount: caseResults.length,
    minCaseCount: MODULE04_IMPROVEMENT_MIN_CASE_COUNT,
    minCaseCountSatisfied:
      caseResults.length >= MODULE04_IMPROVEMENT_MIN_CASE_COUNT,
    scgiPp,
    meanDeltaZScore,
    targetPpThreshold: MODULE04_IMPROVEMENT_TARGET_PP,
    targetSatisfied: scgiPp > MODULE04_IMPROVEMENT_TARGET_PP,
    caseResults,
  };
}
