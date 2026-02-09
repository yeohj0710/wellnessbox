// RND: Module 03 KPI #5 safety-rule/reference accuracy evaluation helpers.

import {
  isRndModule03Decision,
  type RndModule03Decision,
} from "./contracts";

export const MODULE03_REFERENCE_ACCURACY_MIN_RULE_COUNT = 100;
export const MODULE03_REFERENCE_ACCURACY_TARGET_PERCENT = 95;
export const MODULE03_ADVERSE_EVENT_TARGET_MAX_COUNT_PER_YEAR = 5;

export type Module03ReferenceExpectation = {
  ruleId: string;
  ingredientCode: string;
  decision: RndModule03Decision;
  violation: boolean;
  referenceIds: string[];
};

export type Module03ReferenceObservation = {
  ruleId: string;
  ingredientCode: string;
  decision: RndModule03Decision;
  violation: boolean;
  referenceIds: string[];
};

export type Module03ReferenceRuleSample = {
  sampleId: string;
  expected: Module03ReferenceExpectation;
  observed: Module03ReferenceObservation;
};

export type Module03ReferenceRuleResult = {
  sampleId: string;
  ruleId: string;
  logicMatched: boolean;
  referenceMatched: boolean;
  passed: boolean;
};

export type Module03ReferenceEvaluationReport = {
  module: "03_personal_safety_validation_engine";
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
  ruleResults: Module03ReferenceRuleResult[];
};

export type Module03AdverseEventSample = {
  sampleId: string;
  eventId: string;
  caseId: string;
  reportedAt: string;
  linkedToEngineRecommendation: boolean;
};

export type Module03AdverseEventCaseResult = {
  sampleId: string;
  eventId: string;
  caseId: string;
  reportedAt: string;
  linkedToEngineRecommendation: boolean;
  includedInWindow: boolean;
  counted: boolean;
};

export type Module03AdverseEventEvaluationReport = {
  module: "03_personal_safety_validation_engine";
  phase: "EVALUATION";
  kpiId: "kpi-06";
  formula: "AdverseEventCount = count(linked_to_engine = true and reported_at within last 12 months)";
  evaluatedAt: string;
  windowStart: string;
  windowEnd: string;
  eventCount: number;
  countedEventCount: number;
  targetMaxCountPerYear: number;
  targetSatisfied: boolean;
  caseResults: Module03AdverseEventCaseResult[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO datetime string.`);
  }
}

function normalizeStringSet(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const leftNormalized = normalizeStringSet(left);
  const rightNormalized = normalizeStringSet(right);
  if (leftNormalized.length !== rightNormalized.length) return false;

  for (let i = 0; i < leftNormalized.length; i += 1) {
    if (leftNormalized[i] !== rightNormalized[i]) return false;
  }

  return true;
}

function assertExpectation(
  value: Module03ReferenceExpectation,
  fieldName: string
): void {
  if (!isNonEmptyString(value.ruleId)) {
    throw new Error(`${fieldName}.ruleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(value.ingredientCode)) {
    throw new Error(`${fieldName}.ingredientCode must be a non-empty string.`);
  }
  if (!isRndModule03Decision(value.decision)) {
    throw new Error(`${fieldName}.decision must be a valid Module 03 decision.`);
  }
  if (typeof value.violation !== "boolean") {
    throw new Error(`${fieldName}.violation must be a boolean.`);
  }
  if (!Array.isArray(value.referenceIds) || value.referenceIds.length === 0) {
    throw new Error(`${fieldName}.referenceIds must include at least one reference ID.`);
  }
  if (!value.referenceIds.every((referenceId) => isNonEmptyString(referenceId))) {
    throw new Error(`${fieldName}.referenceIds must contain non-empty strings.`);
  }
}

function assertObservation(
  value: Module03ReferenceObservation,
  fieldName: string
): void {
  if (!isNonEmptyString(value.ruleId)) {
    throw new Error(`${fieldName}.ruleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(value.ingredientCode)) {
    throw new Error(`${fieldName}.ingredientCode must be a non-empty string.`);
  }
  if (!isRndModule03Decision(value.decision)) {
    throw new Error(`${fieldName}.decision must be a valid Module 03 decision.`);
  }
  if (typeof value.violation !== "boolean") {
    throw new Error(`${fieldName}.violation must be a boolean.`);
  }
  if (!Array.isArray(value.referenceIds) || value.referenceIds.length === 0) {
    throw new Error(`${fieldName}.referenceIds must include at least one reference ID.`);
  }
  if (!value.referenceIds.every((referenceId) => isNonEmptyString(referenceId))) {
    throw new Error(`${fieldName}.referenceIds must contain non-empty strings.`);
  }
}

function assertRuleSample(sample: Module03ReferenceRuleSample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  assertExpectation(sample.expected, `${location}.expected`);
  assertObservation(sample.observed, `${location}.observed`);
}

function roundTo2(value: number): number {
  return Number(value.toFixed(2));
}

function assertAdverseEventSample(
  sample: Module03AdverseEventSample,
  index: number
): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.eventId)) {
    throw new Error(`${location}.eventId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.caseId)) {
    throw new Error(`${location}.caseId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.reportedAt)) {
    throw new Error(`${location}.reportedAt must be a non-empty string.`);
  }
  assertIsoDateTime(sample.reportedAt, `${location}.reportedAt`);
  if (typeof sample.linkedToEngineRecommendation !== "boolean") {
    throw new Error(
      `${location}.linkedToEngineRecommendation must be a boolean.`
    );
  }
}

export function evaluateModule03ReferenceAccuracy(
  samples: Module03ReferenceRuleSample[],
  evaluatedAt = new Date().toISOString()
): Module03ReferenceEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 03 evaluation requires at least one rule sample.");
  }

  const ruleResults = samples.map((sample, index) => {
    assertRuleSample(sample, index);

    const logicMatched =
      sample.expected.ruleId === sample.observed.ruleId &&
      sample.expected.ingredientCode === sample.observed.ingredientCode &&
      sample.expected.decision === sample.observed.decision &&
      sample.expected.violation === sample.observed.violation;

    const referenceMatched = sameStringSet(
      sample.expected.referenceIds,
      sample.observed.referenceIds
    );

    return {
      sampleId: sample.sampleId,
      ruleId: sample.expected.ruleId,
      logicMatched,
      referenceMatched,
      passed: logicMatched && referenceMatched,
    };
  });

  const passedRuleCount = ruleResults.filter((result) => result.passed).length;
  const accuracyPercent = roundTo2((passedRuleCount / ruleResults.length) * 100);
  const minRuleCountSatisfied =
    ruleResults.length >= MODULE03_REFERENCE_ACCURACY_MIN_RULE_COUNT;
  const targetSatisfied = accuracyPercent >= MODULE03_REFERENCE_ACCURACY_TARGET_PERCENT;

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-05",
    formula: "Accuracy = 100 * (1/R) * sum(I(l_r == l_ref and f_r == f_ref))",
    evaluatedAt,
    ruleCount: ruleResults.length,
    passedRuleCount,
    accuracyPercent,
    targetPercent: MODULE03_REFERENCE_ACCURACY_TARGET_PERCENT,
    minRuleCount: MODULE03_REFERENCE_ACCURACY_MIN_RULE_COUNT,
    targetSatisfied,
    minRuleCountSatisfied,
    ruleResults,
  };
}

export function evaluateModule03AdverseEventCount(
  samples: Module03AdverseEventSample[],
  evaluatedAt = new Date().toISOString()
): Module03AdverseEventEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 03 adverse-event evaluation requires at least one sample.");
  }
  assertIsoDateTime(evaluatedAt, "evaluatedAt");

  const windowEndDate = new Date(evaluatedAt);
  const windowStartDate = new Date(windowEndDate);
  windowStartDate.setUTCFullYear(windowStartDate.getUTCFullYear() - 1);
  const windowStart = windowStartDate.toISOString();
  const windowEnd = windowEndDate.toISOString();
  const windowStartMs = windowStartDate.valueOf();
  const windowEndMs = windowEndDate.valueOf();

  const caseResults = samples.map((sample, index) => {
    assertAdverseEventSample(sample, index);
    const reportedAtMs = Date.parse(sample.reportedAt);
    const includedInWindow =
      reportedAtMs >= windowStartMs && reportedAtMs <= windowEndMs;
    const counted = sample.linkedToEngineRecommendation && includedInWindow;

    return {
      sampleId: sample.sampleId,
      eventId: sample.eventId,
      caseId: sample.caseId,
      reportedAt: sample.reportedAt,
      linkedToEngineRecommendation: sample.linkedToEngineRecommendation,
      includedInWindow,
      counted,
    };
  });

  const countedEventCount = caseResults.filter((result) => result.counted).length;
  const targetSatisfied =
    countedEventCount <= MODULE03_ADVERSE_EVENT_TARGET_MAX_COUNT_PER_YEAR;

  return {
    module: "03_personal_safety_validation_engine",
    phase: "EVALUATION",
    kpiId: "kpi-06",
    formula:
      "AdverseEventCount = count(linked_to_engine = true and reported_at within last 12 months)",
    evaluatedAt: windowEnd,
    windowStart,
    windowEnd,
    eventCount: caseResults.length,
    countedEventCount,
    targetMaxCountPerYear: MODULE03_ADVERSE_EVENT_TARGET_MAX_COUNT_PER_YEAR,
    targetSatisfied,
    caseResults,
  };
}
