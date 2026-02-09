// RND: Module 07 KPI #7/#5 evaluation helpers.

import {
  RND_MODULE_07_DATA_SOURCES,
  isRndModule07DataSource,
  type RndModule07DataSource,
} from "./contracts";
import {
  isRndModule02SourceKind,
  type RndDataSensitivity,
  type RndModule02SourceKind,
} from "../module02-data-lake/contracts";

const MODULE07_DATA_SENSITIVITY_LEVELS = ["public", "internal", "sensitive"] as const;

export const MODULE07_INTEGRATION_RATE_MIN_SAMPLE_COUNT = 100;
export const MODULE07_INTEGRATION_RATE_MIN_SOURCE_SAMPLE_COUNT = 10;
export const MODULE07_INTEGRATION_RATE_TARGET_PERCENT = 90;

export const MODULE07_INTERFACE_ACCURACY_MIN_RULE_COUNT = 100;
export const MODULE07_INTERFACE_ACCURACY_TARGET_PERCENT = 95;

export type Module07IntegrationRateSample = {
  sampleId: string;
  source: RndModule07DataSource;
  sessionSuccess: boolean;
  dataLakeLinked: boolean;
};

export type Module07IntegrationRateSourceResult = {
  source: RndModule07DataSource;
  totalSampleCount: number;
  successfulSampleCount: number;
  integrationRatePercent: number;
  targetPercent: number;
  targetSatisfied: boolean;
  minSourceSampleCount: number;
  minSourceSampleCountSatisfied: boolean;
};

export type Module07IntegrationRateEvaluationReport = {
  module: "07_biosensor_and_genetic_data_integration";
  phase: "EVALUATION";
  kpiId: "kpi-07";
  formula: "r_s = 100 * successful_s / total_s; R = (r_W + r_C + r_G) / 3";
  evaluatedAt: string;
  sampleCount: number;
  minSampleCount: number;
  sampleCountSatisfied: boolean;
  minSourceSampleCount: number;
  sourceCoverageSatisfied: boolean;
  perSourceMinSampleCountSatisfied: boolean;
  overallIntegrationRatePercent: number;
  targetPercent: number;
  targetSatisfied: boolean;
  sourceResults: Module07IntegrationRateSourceResult[];
};

export type Module07InterfaceExpectation = {
  sessionId: string;
  source: RndModule07DataSource;
  sourceKind: RndModule02SourceKind;
  sensitivity: RndDataSensitivity;
  linked: boolean;
  dataLakeRecordId: string | null;
};

export type Module07InterfaceObservation = {
  sessionId: string;
  source: RndModule07DataSource;
  sourceKind: RndModule02SourceKind;
  sensitivity: RndDataSensitivity;
  linked: boolean;
  dataLakeRecordId: string | null;
};

export type Module07InterfaceWiringSample = {
  sampleId: string;
  expected: Module07InterfaceExpectation;
  observed: Module07InterfaceObservation;
};

export type Module07InterfaceWiringRuleResult = {
  sampleId: string;
  sessionId: string;
  logicMatched: boolean;
  interfaceMatched: boolean;
  recordLinkMatched: boolean;
  passed: boolean;
};

export type Module07InterfaceWiringEvaluationReport = {
  module: "07_biosensor_and_genetic_data_integration";
  phase: "EVALUATION";
  kpiId: "kpi-05";
  formula: "Accuracy = 100 * (1/R) * sum(I(l_r == l_ref and f_r == f_ref))";
  evaluatedAt: string;
  ruleCount: number;
  passedRuleCount: number;
  accuracyPercent: number;
  targetPercent: number;
  minRuleCount: number;
  targetSatisfied: boolean;
  minRuleCountSatisfied: boolean;
  ruleResults: Module07InterfaceWiringRuleResult[];
};

export type Module07EvaluationReport = {
  module: "07_biosensor_and_genetic_data_integration";
  phase: "EVALUATION";
  evaluatedAt: string;
  integrationRateReport: Module07IntegrationRateEvaluationReport;
  interfaceWiringReport: Module07InterfaceWiringEvaluationReport;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO datetime string.`);
  }
}

function isRndDataSensitivity(value: unknown): value is RndDataSensitivity {
  return (
    typeof value === "string" &&
    (MODULE07_DATA_SENSITIVITY_LEVELS as readonly string[]).includes(value)
  );
}

function assertIntegrationSample(
  sample: Module07IntegrationRateSample,
  index: number
): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isRndModule07DataSource(sample.source)) {
    throw new Error(`${location}.source must be a valid Module 07 source.`);
  }
  if (typeof sample.sessionSuccess !== "boolean") {
    throw new Error(`${location}.sessionSuccess must be a boolean.`);
  }
  if (typeof sample.dataLakeLinked !== "boolean") {
    throw new Error(`${location}.dataLakeLinked must be a boolean.`);
  }
}

function assertInterfaceExpectation(
  value: Module07InterfaceExpectation,
  fieldName: string
): void {
  if (!isNonEmptyString(value.sessionId)) {
    throw new Error(`${fieldName}.sessionId must be a non-empty string.`);
  }
  if (!isRndModule07DataSource(value.source)) {
    throw new Error(`${fieldName}.source must be a valid Module 07 source.`);
  }
  if (!isRndModule02SourceKind(value.sourceKind)) {
    throw new Error(`${fieldName}.sourceKind must be a valid Module 02 source kind.`);
  }
  if (!isRndDataSensitivity(value.sensitivity)) {
    throw new Error(`${fieldName}.sensitivity must be a valid data sensitivity.`);
  }
  if (typeof value.linked !== "boolean") {
    throw new Error(`${fieldName}.linked must be a boolean.`);
  }
  if (value.dataLakeRecordId !== null && !isNonEmptyString(value.dataLakeRecordId)) {
    throw new Error(
      `${fieldName}.dataLakeRecordId must be null or a non-empty string.`
    );
  }
}

function assertInterfaceObservation(
  value: Module07InterfaceObservation,
  fieldName: string
): void {
  if (!isNonEmptyString(value.sessionId)) {
    throw new Error(`${fieldName}.sessionId must be a non-empty string.`);
  }
  if (!isRndModule07DataSource(value.source)) {
    throw new Error(`${fieldName}.source must be a valid Module 07 source.`);
  }
  if (!isRndModule02SourceKind(value.sourceKind)) {
    throw new Error(`${fieldName}.sourceKind must be a valid Module 02 source kind.`);
  }
  if (!isRndDataSensitivity(value.sensitivity)) {
    throw new Error(`${fieldName}.sensitivity must be a valid data sensitivity.`);
  }
  if (typeof value.linked !== "boolean") {
    throw new Error(`${fieldName}.linked must be a boolean.`);
  }
  if (value.dataLakeRecordId !== null && !isNonEmptyString(value.dataLakeRecordId)) {
    throw new Error(
      `${fieldName}.dataLakeRecordId must be null or a non-empty string.`
    );
  }
}

function assertInterfaceSample(sample: Module07InterfaceWiringSample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  assertInterfaceExpectation(sample.expected, `${location}.expected`);
  assertInterfaceObservation(sample.observed, `${location}.observed`);
}

export function evaluateModule07IntegrationRate(
  samples: Module07IntegrationRateSample[],
  evaluatedAt = new Date().toISOString()
): Module07IntegrationRateEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 07 KPI #7 evaluation requires at least one session sample.");
  }
  assertIsoDateTime(evaluatedAt, "evaluatedAt");

  samples.forEach((sample, index) => {
    assertIntegrationSample(sample, index);
  });

  const sourceResults = RND_MODULE_07_DATA_SOURCES.map((source) => {
    const sourceSamples = samples.filter((sample) => sample.source === source);
    const totalSampleCount = sourceSamples.length;
    const successfulSampleCount = sourceSamples.filter(
      (sample) => sample.sessionSuccess && sample.dataLakeLinked
    ).length;
    const integrationRatePercent =
      totalSampleCount === 0
        ? 0
        : roundTo((successfulSampleCount / totalSampleCount) * 100, 2);

    return {
      source,
      totalSampleCount,
      successfulSampleCount,
      integrationRatePercent,
      targetPercent: MODULE07_INTEGRATION_RATE_TARGET_PERCENT,
      targetSatisfied: integrationRatePercent >= MODULE07_INTEGRATION_RATE_TARGET_PERCENT,
      minSourceSampleCount: MODULE07_INTEGRATION_RATE_MIN_SOURCE_SAMPLE_COUNT,
      minSourceSampleCountSatisfied:
        totalSampleCount >= MODULE07_INTEGRATION_RATE_MIN_SOURCE_SAMPLE_COUNT,
    };
  });

  const sourceCoverageSatisfied = sourceResults.every(
    (result) => result.totalSampleCount > 0
  );
  const perSourceMinSampleCountSatisfied = sourceResults.every(
    (result) => result.minSourceSampleCountSatisfied
  );
  const overallIntegrationRatePercent = roundTo(
    sourceResults.reduce((sum, result) => sum + result.integrationRatePercent, 0) /
      sourceResults.length,
    2
  );
  const sampleCountSatisfied =
    samples.length >= MODULE07_INTEGRATION_RATE_MIN_SAMPLE_COUNT;
  const targetSatisfied =
    overallIntegrationRatePercent >= MODULE07_INTEGRATION_RATE_TARGET_PERCENT;

  return {
    module: "07_biosensor_and_genetic_data_integration",
    phase: "EVALUATION",
    kpiId: "kpi-07",
    formula: "r_s = 100 * successful_s / total_s; R = (r_W + r_C + r_G) / 3",
    evaluatedAt,
    sampleCount: samples.length,
    minSampleCount: MODULE07_INTEGRATION_RATE_MIN_SAMPLE_COUNT,
    sampleCountSatisfied,
    minSourceSampleCount: MODULE07_INTEGRATION_RATE_MIN_SOURCE_SAMPLE_COUNT,
    sourceCoverageSatisfied,
    perSourceMinSampleCountSatisfied,
    overallIntegrationRatePercent,
    targetPercent: MODULE07_INTEGRATION_RATE_TARGET_PERCENT,
    targetSatisfied,
    sourceResults,
  };
}

export function evaluateModule07InterfaceWiringAccuracy(
  samples: Module07InterfaceWiringSample[],
  evaluatedAt = new Date().toISOString()
): Module07InterfaceWiringEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 07 KPI #5 evaluation requires at least one wiring rule sample.");
  }
  assertIsoDateTime(evaluatedAt, "evaluatedAt");

  const ruleResults = samples.map((sample, index) => {
    assertInterfaceSample(sample, index);

    const logicMatched =
      sample.expected.sessionId === sample.observed.sessionId &&
      sample.expected.source === sample.observed.source &&
      sample.expected.linked === sample.observed.linked;
    const interfaceMatched =
      sample.expected.sourceKind === sample.observed.sourceKind &&
      sample.expected.sensitivity === sample.observed.sensitivity;
    const recordLinkMatched =
      sample.expected.dataLakeRecordId === sample.observed.dataLakeRecordId;

    return {
      sampleId: sample.sampleId,
      sessionId: sample.expected.sessionId,
      logicMatched,
      interfaceMatched,
      recordLinkMatched,
      passed: logicMatched && interfaceMatched && recordLinkMatched,
    };
  });

  const passedRuleCount = ruleResults.filter((ruleResult) => ruleResult.passed).length;
  const accuracyPercent = roundTo((passedRuleCount / ruleResults.length) * 100, 2);
  const minRuleCountSatisfied =
    ruleResults.length >= MODULE07_INTERFACE_ACCURACY_MIN_RULE_COUNT;
  const targetSatisfied =
    accuracyPercent >= MODULE07_INTERFACE_ACCURACY_TARGET_PERCENT;

  return {
    module: "07_biosensor_and_genetic_data_integration",
    phase: "EVALUATION",
    kpiId: "kpi-05",
    formula: "Accuracy = 100 * (1/R) * sum(I(l_r == l_ref and f_r == f_ref))",
    evaluatedAt,
    ruleCount: ruleResults.length,
    passedRuleCount,
    accuracyPercent,
    targetPercent: MODULE07_INTERFACE_ACCURACY_TARGET_PERCENT,
    minRuleCount: MODULE07_INTERFACE_ACCURACY_MIN_RULE_COUNT,
    targetSatisfied,
    minRuleCountSatisfied,
    ruleResults,
  };
}

export function evaluateModule07IntegrationAndInterface(
  integrationSamples: Module07IntegrationRateSample[],
  interfaceSamples: Module07InterfaceWiringSample[],
  evaluatedAt = new Date().toISOString()
): Module07EvaluationReport {
  assertIsoDateTime(evaluatedAt, "evaluatedAt");
  const integrationRateReport = evaluateModule07IntegrationRate(
    integrationSamples,
    evaluatedAt
  );
  const interfaceWiringReport = evaluateModule07InterfaceWiringAccuracy(
    interfaceSamples,
    evaluatedAt
  );

  return {
    module: "07_biosensor_and_genetic_data_integration",
    phase: "EVALUATION",
    evaluatedAt,
    integrationRateReport,
    interfaceWiringReport,
  };
}
