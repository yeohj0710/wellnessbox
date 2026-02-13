// RND: Module 04 Efficacy Quantification Model scaffold fixture builder.

import {
  assertRndModule04EvaluationInput,
  assertRndModule04NormalizationRule,
  assertRndModule04QuantificationOutput,
  type RndModule04EvaluationInput,
  type RndModule04NormalizationRule,
  type RndModule04QuantificationOutput,
} from "./contracts";

export type Module04ScaffoldBundle = {
  generatedAt: string;
  evaluationInputs: RndModule04EvaluationInput[];
  normalizationRules: RndModule04NormalizationRule[];
  output: RndModule04QuantificationOutput;
};

function assertIsoDateTime(value: string, fieldName: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function buildModule04ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module04ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const evaluationInputA: RndModule04EvaluationInput = {
    evaluationId: "rnd04-eval-user-a1",
    module: "04_efficacy_quantification_model",
    schemaVersion: "2026-02-scaffold-v1",
    capturedAt: generatedAt,
    profile: {
      appUserIdHash: "sha256:8aeb9fa4e1c4d311",
      ageBand: "30-39",
      sex: "female",
      healthGoals: ["sleep-quality", "inflammation-control"],
      baselineConditions: ["fatigue"],
    },
    intervention: {
      planId: "rnd04-plan-a1",
      ingredientCodes: ["magnesium", "omega3"],
      startedAt: "2025-11-01T00:00:00.000Z",
      endedAt: "2026-01-31T23:59:59.000Z",
      dailyDoseCount: 2,
      adherenceRate: 0.93,
    },
    measurements: [
      {
        measurementId: "a1-sleep-pre-01",
        metricKey: "sleep_quality_score",
        metricKind: "survey",
        unit: "point",
        period: "pre",
        measuredAt: "2025-10-20T09:00:00.000Z",
        rawValue: 52,
      },
      {
        measurementId: "a1-sleep-post-01",
        metricKey: "sleep_quality_score",
        metricKind: "survey",
        unit: "point",
        period: "post",
        measuredAt: "2026-01-25T09:00:00.000Z",
        rawValue: 71,
      },
      {
        measurementId: "a1-hscrp-pre-01",
        metricKey: "hs_crp",
        metricKind: "biomarker",
        unit: "mg_per_l",
        period: "pre",
        measuredAt: "2025-10-22T10:00:00.000Z",
        rawValue: 3.2,
      },
      {
        measurementId: "a1-hscrp-post-01",
        metricKey: "hs_crp",
        metricKind: "biomarker",
        unit: "mg_per_l",
        period: "post",
        measuredAt: "2026-01-26T10:00:00.000Z",
        rawValue: 1.4,
      },
    ],
  };

  const evaluationInputB: RndModule04EvaluationInput = {
    evaluationId: "rnd04-eval-user-b2",
    module: "04_efficacy_quantification_model",
    schemaVersion: "2026-02-scaffold-v1",
    capturedAt: generatedAt,
    profile: {
      appUserIdHash: "sha256:12f4d08be90cc6fd",
      ageBand: "40-49",
      sex: "male",
      healthGoals: ["metabolic-balance"],
      baselineConditions: ["prediabetes"],
    },
    intervention: {
      planId: "rnd04-plan-b2",
      ingredientCodes: ["berberine"],
      startedAt: "2025-11-01T00:00:00.000Z",
      endedAt: "2026-01-31T23:59:59.000Z",
      dailyDoseCount: 2,
      adherenceRate: 0.42,
    },
    measurements: [
      {
        measurementId: "b2-fbs-pre-01",
        metricKey: "fasting_glucose",
        metricKind: "biomarker",
        unit: "mg_per_dl",
        period: "pre",
        measuredAt: "2025-10-20T08:00:00.000Z",
        rawValue: 112,
      },
      {
        measurementId: "b2-fbs-post-01",
        metricKey: "fasting_glucose",
        metricKind: "biomarker",
        unit: "mg_per_dl",
        period: "post",
        measuredAt: "2026-01-25T08:00:00.000Z",
        rawValue: 108,
      },
    ],
  };

  const normalizationRules: RndModule04NormalizationRule[] = [
    {
      ruleId: "rnd04-rule-sleep-z-v1",
      metricKey: "sleep_quality_score",
      method: "z_score",
      baselineMean: 50,
      baselineStdDev: 10,
      higherIsBetter: true,
      version: "v1.0.0",
    },
    {
      ruleId: "rnd04-rule-hscrp-z-v1",
      metricKey: "hs_crp",
      method: "z_score",
      baselineMean: 2.5,
      baselineStdDev: 1.2,
      higherIsBetter: false,
      version: "v1.0.0",
    },
    {
      ruleId: "rnd04-rule-fbs-z-v1",
      metricKey: "fasting_glucose",
      method: "z_score",
      baselineMean: 100,
      baselineStdDev: 15,
      higherIsBetter: false,
      version: "v1.0.0",
    },
  ];

  const output: RndModule04QuantificationOutput = {
    evaluationRunId: "rnd04-run-2026-02-scaffold-001",
    module: "04_efficacy_quantification_model",
    schemaVersion: "2026-02-scaffold-v1",
    generatedAt,
    includedUserCount: 1,
    excludedUserCount: 1,
    averageImprovementPp: 20.7,
    userResults: [
      {
        resultId: "rnd04-result-user-a1",
        evaluationId: "rnd04-eval-user-a1",
        appUserIdHash: "sha256:8aeb9fa4e1c4d311",
        preScore: -0.29,
        postScore: 1.17,
        deltaScore: 1.46,
        improvementPp: 20.7,
        metricContributions: [
          {
            metricKey: "sleep_quality_score",
            preZ: 0.2,
            postZ: 2.1,
            deltaZ: 1.9,
            improvementPp: 40.2,
          },
          {
            metricKey: "hs_crp",
            preZ: -0.58,
            postZ: 0.92,
            deltaZ: 1.5,
            improvementPp: 1.2,
          },
        ],
        computedAt: generatedAt,
      },
    ],
    excludedCases: [
      {
        evaluationId: "rnd04-eval-user-b2",
        appUserIdHash: "sha256:12f4d08be90cc6fd",
        reason: "low_adherence",
        detail: "Adherence rate 0.42 is below the minimum threshold 0.70.",
        recordedAt: generatedAt,
      },
    ],
    meta: {
      datasetVersion: "rnd04-scaffold-dataset-v1",
      normalizationVersion: "v1.0.0",
      preWindow: {
        startAt: "2025-10-01T00:00:00.000Z",
        endAt: "2025-10-31T23:59:59.000Z",
      },
      postWindow: {
        startAt: "2026-01-01T00:00:00.000Z",
        endAt: "2026-01-31T23:59:59.000Z",
      },
      minMeasurementsPerPeriod: 1,
      generatedAt,
    },
  };

  const bundle: Module04ScaffoldBundle = {
    generatedAt,
    evaluationInputs: [evaluationInputA, evaluationInputB],
    normalizationRules,
    output,
  };
  assertModule04ScaffoldBundle(bundle);
  return bundle;
}

export function assertModule04ScaffoldBundle(bundle: Module04ScaffoldBundle): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");

  if (bundle.evaluationInputs.length === 0) {
    throw new Error("At least one Module 04 evaluation input is required.");
  }
  bundle.evaluationInputs.forEach((input) => assertRndModule04EvaluationInput(input));

  if (bundle.normalizationRules.length === 0) {
    throw new Error("At least one Module 04 normalization rule is required.");
  }
  bundle.normalizationRules.forEach((rule) => assertRndModule04NormalizationRule(rule));

  const ruleIds = new Set(bundle.normalizationRules.map((rule) => rule.ruleId));
  if (ruleIds.size !== bundle.normalizationRules.length) {
    throw new Error("Module 04 normalization rules must be unique by ruleId.");
  }
  const metricKeys = new Set(bundle.normalizationRules.map((rule) => rule.metricKey));

  assertRndModule04QuantificationOutput(bundle.output);
  if (bundle.output.generatedAt !== bundle.generatedAt) {
    throw new Error("Module 04 bundle generatedAt must match output generatedAt.");
  }

  const evaluationPairs = new Set(
    bundle.evaluationInputs.map(
      (input) => `${input.evaluationId}:${input.profile.appUserIdHash}`
    )
  );
  if (evaluationPairs.size !== bundle.evaluationInputs.length) {
    throw new Error("Module 04 inputs must be unique by evaluationId and appUserIdHash.");
  }

  const includedUsers = new Set<string>();
  bundle.output.userResults.forEach((result) => {
    const key = `${result.evaluationId}:${result.appUserIdHash}`;
    if (!evaluationPairs.has(key)) {
      throw new Error(`Missing input for output result ${result.resultId}.`);
    }
    includedUsers.add(result.appUserIdHash);
    result.metricContributions.forEach((contribution) => {
      if (!metricKeys.has(contribution.metricKey)) {
        throw new Error(
          `Missing normalization rule for metric ${contribution.metricKey}.`
        );
      }
    });
  });

  bundle.output.excludedCases.forEach((excludedCase) => {
    const key = `${excludedCase.evaluationId}:${excludedCase.appUserIdHash}`;
    if (!evaluationPairs.has(key)) {
      throw new Error(
        `Missing input for excluded case ${excludedCase.evaluationId}.`
      );
    }
    if (includedUsers.has(excludedCase.appUserIdHash)) {
      throw new Error(
        `User ${excludedCase.appUserIdHash} cannot be both included and excluded.`
      );
    }
  });
}
