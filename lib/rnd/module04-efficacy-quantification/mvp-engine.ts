// RND: Module 04 Efficacy Quantification Model MVP deterministic runtime.

import {
  RND_MODULE_04_NAME,
  assertRndModule04EvaluationInput,
  assertRndModule04NormalizationRule,
  assertRndModule04QuantificationOutput,
  type RndModule04EvaluationInput,
  type RndModule04NormalizationRule,
  type RndModule04QuantificationOutput,
} from "./contracts";
import {
  average,
  buildDeterministicRunId,
  buildMeasurementWindow,
  buildRuleMap,
  buildUserResult,
  evaluateInputContributions,
  roundTo,
  type ContributionDraft,
  type ExclusionDraft,
} from "./mvp-engine-helpers";

const MODULE04_MVP_PHASE = "MVP" as const;
const DEFAULT_ADHERENCE_THRESHOLD = 0.7;
const DEFAULT_MIN_MEASUREMENTS_PER_PERIOD = 1;
const DEFAULT_OUTLIER_Z_THRESHOLD = 4;

export type Module04MvpRuntimeLog = {
  logId: string;
  module: typeof RND_MODULE_04_NAME;
  phase: typeof MODULE04_MVP_PHASE;
  stage: "input_validation" | "inclusion_exclusion" | "quantification" | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type RunModule04EfficacyQuantificationMvpInput = {
  evaluationInputs: RndModule04EvaluationInput[];
  normalizationRules: RndModule04NormalizationRule[];
  generatedAt?: string;
  evaluationRunId?: string;
  datasetVersion?: string;
  minMeasurementsPerPeriod?: number;
  adherenceThreshold?: number;
  outlierZThreshold?: number;
};

export type RunModule04EfficacyQuantificationMvpResult = {
  module: typeof RND_MODULE_04_NAME;
  phase: typeof MODULE04_MVP_PHASE;
  generatedAt: string;
  output: RndModule04QuantificationOutput;
  runtimeLogs: Module04MvpRuntimeLog[];
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function runModule04EfficacyQuantificationMvp(
  input: RunModule04EfficacyQuantificationMvpInput
): RunModule04EfficacyQuantificationMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  const adherenceThreshold = input.adherenceThreshold ?? DEFAULT_ADHERENCE_THRESHOLD;
  const minMeasurementsPerPeriod =
    input.minMeasurementsPerPeriod ?? DEFAULT_MIN_MEASUREMENTS_PER_PERIOD;
  const outlierZThreshold = input.outlierZThreshold ?? DEFAULT_OUTLIER_Z_THRESHOLD;
  const datasetVersion = input.datasetVersion ?? "rnd04-mvp-dataset-v1";

  if (!Number.isFinite(adherenceThreshold) || adherenceThreshold < 0 || adherenceThreshold > 1) {
    throw new Error("adherenceThreshold must be between 0 and 1.");
  }
  if (!Number.isInteger(minMeasurementsPerPeriod) || minMeasurementsPerPeriod <= 0) {
    throw new Error("minMeasurementsPerPeriod must be a positive integer.");
  }
  if (!Number.isFinite(outlierZThreshold) || outlierZThreshold <= 0) {
    throw new Error("outlierZThreshold must be a positive number.");
  }
  if (input.evaluationInputs.length === 0) {
    throw new Error("Module 04 MVP requires at least one evaluation input.");
  }
  if (input.normalizationRules.length === 0) {
    throw new Error("Module 04 MVP requires at least one normalization rule.");
  }

  input.evaluationInputs.forEach((item) => assertRndModule04EvaluationInput(item));
  input.normalizationRules.forEach((item) => assertRndModule04NormalizationRule(item));

  const runtimeLogs: Module04MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module04MvpRuntimeLog["stage"],
    event: string,
    details: Module04MvpRuntimeLog["details"]
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m04-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      module: RND_MODULE_04_NAME,
      phase: MODULE04_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: generatedAt,
    });
  };

  const ruleMap = buildRuleMap(input.normalizationRules);
  pushRuntimeLog("input_validation", "validated_inputs", {
    evaluationCount: input.evaluationInputs.length,
    ruleCount: input.normalizationRules.length,
    adherenceThreshold,
    minMeasurementsPerPeriod,
    outlierZThreshold,
  });

  const userResults: ReturnType<typeof buildUserResult>[] = [];
  const excludedCases: RndModule04QuantificationOutput["excludedCases"] = [];

  for (const evaluationInput of input.evaluationInputs) {
    const preCount = evaluationInput.measurements.filter(
      (measurement) => measurement.period === "pre"
    ).length;
    const postCount = evaluationInput.measurements.filter(
      (measurement) => measurement.period === "post"
    ).length;

    let exclusion: ExclusionDraft | null = null;
    if (evaluationInput.intervention.adherenceRate < adherenceThreshold) {
      exclusion = {
        reason: "low_adherence",
        detail: `Adherence rate ${roundTo(evaluationInput.intervention.adherenceRate, 4)} is below threshold ${adherenceThreshold}.`,
      };
    } else if (preCount < minMeasurementsPerPeriod) {
      exclusion = {
        reason: "missing_pre",
        detail: `Pre-period measurement count ${preCount} is below minimum ${minMeasurementsPerPeriod}.`,
      };
    } else if (postCount < minMeasurementsPerPeriod) {
      exclusion = {
        reason: "missing_post",
        detail: `Post-period measurement count ${postCount} is below minimum ${minMeasurementsPerPeriod}.`,
      };
    }

    let contributions: ContributionDraft[] = [];
    if (!exclusion) {
      const contributionResult = evaluateInputContributions(
        evaluationInput,
        ruleMap,
        outlierZThreshold
      );
      contributions = contributionResult.contributions;
      exclusion = contributionResult.exclusion;
    }

    if (exclusion) {
      excludedCases.push({
        evaluationId: evaluationInput.evaluationId,
        appUserIdHash: evaluationInput.profile.appUserIdHash,
        reason: exclusion.reason,
        detail: exclusion.detail,
        recordedAt: generatedAt,
      });
      pushRuntimeLog("inclusion_exclusion", "excluded_case", {
        evaluationId: evaluationInput.evaluationId,
        appUserIdHash: evaluationInput.profile.appUserIdHash,
        reason: exclusion.reason,
      });
      continue;
    }

    const userResult = buildUserResult(
      evaluationInput,
      contributions,
      generatedAt,
      userResults.length
    );
    userResults.push(userResult);

    pushRuntimeLog("quantification", "quantified_case", {
      evaluationId: evaluationInput.evaluationId,
      appUserIdHash: evaluationInput.profile.appUserIdHash,
      contributionCount: contributions.length,
      improvementPp: userResult.improvementPp,
    });
  }

  const averageImprovementPp =
    userResults.length > 0
      ? roundTo(average(userResults.map((result) => result.improvementPp)), 4)
      : 0;

  const normalizationVersionSet = new Set(input.normalizationRules.map((rule) => rule.version));
  const normalizationVersion =
    normalizationVersionSet.size === 1
      ? input.normalizationRules[0].version
      : Array.from(normalizationVersionSet).sort().join(",");

  const output: RndModule04QuantificationOutput = {
    evaluationRunId: input.evaluationRunId ?? buildDeterministicRunId(generatedAt),
    module: RND_MODULE_04_NAME,
    schemaVersion: input.evaluationInputs[0].schemaVersion,
    generatedAt,
    includedUserCount: userResults.length,
    excludedUserCount: excludedCases.length,
    averageImprovementPp,
    userResults,
    excludedCases,
    meta: {
      datasetVersion,
      normalizationVersion,
      preWindow: buildMeasurementWindow(input.evaluationInputs, "pre", generatedAt),
      postWindow: buildMeasurementWindow(input.evaluationInputs, "post", generatedAt),
      minMeasurementsPerPeriod,
      generatedAt,
    },
  };
  assertRndModule04QuantificationOutput(output);

  pushRuntimeLog("output_build", "built_quantification_output", {
    includedUserCount: output.includedUserCount,
    excludedUserCount: output.excludedUserCount,
    averageImprovementPp: output.averageImprovementPp,
  });

  return {
    module: RND_MODULE_04_NAME,
    phase: MODULE04_MVP_PHASE,
    generatedAt,
    output,
    runtimeLogs,
  };
}
