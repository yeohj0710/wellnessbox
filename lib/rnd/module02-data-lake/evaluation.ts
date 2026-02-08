// RND: Module 02 KPI #5 reference-accuracy evaluation helpers.

import type { RndModule02SourceKind } from "./contracts";

export const MODULE02_REFERENCE_ACCURACY_MIN_RULE_COUNT = 100;
export const MODULE02_REFERENCE_ACCURACY_TARGET_PERCENT = 95;

export type Module02ReferenceSet = {
  evidenceIds: string[];
  sourceKinds: RndModule02SourceKind[];
  lineagePath: string[];
};

export type Module02ReferenceExpectation = {
  logicId: string;
  reference: Module02ReferenceSet;
};

export type Module02ReferenceObservation = {
  logicId: string;
  reference: Module02ReferenceSet;
};

export type Module02ReferenceRuleSample = {
  ruleId: string;
  sampleId: string;
  expected: Module02ReferenceExpectation;
  observed: Module02ReferenceObservation;
};

export type Module02ReferenceRuleResult = {
  ruleId: string;
  sampleId: string;
  logicMatched: boolean;
  referenceMatched: boolean;
  sourceKindsMatched: boolean;
  lineageMatched: boolean;
  passed: boolean;
};

export type Module02ReferenceEvaluationReport = {
  module: "02_data_lake";
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
  ruleResults: Module02ReferenceRuleResult[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function sameOrderedList(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function assertReferenceSet(value: Module02ReferenceSet, fieldName: string): void {
  if (!Array.isArray(value.evidenceIds) || value.evidenceIds.length === 0) {
    throw new Error(`${fieldName}.evidenceIds must include at least one ID.`);
  }
  if (!value.evidenceIds.every((id) => isNonEmptyString(id))) {
    throw new Error(`${fieldName}.evidenceIds must contain non-empty strings.`);
  }

  if (!Array.isArray(value.sourceKinds) || value.sourceKinds.length === 0) {
    throw new Error(`${fieldName}.sourceKinds must include at least one source kind.`);
  }
  if (!value.sourceKinds.every((sourceKind) => isNonEmptyString(sourceKind))) {
    throw new Error(`${fieldName}.sourceKinds must contain non-empty strings.`);
  }

  if (!Array.isArray(value.lineagePath) || value.lineagePath.length === 0) {
    throw new Error(`${fieldName}.lineagePath must include at least one lineage step.`);
  }
  if (!value.lineagePath.every((step) => isNonEmptyString(step))) {
    throw new Error(`${fieldName}.lineagePath must contain non-empty strings.`);
  }
}

function assertRuleSample(sample: Module02ReferenceRuleSample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.ruleId)) {
    throw new Error(`${location}.ruleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.expected.logicId)) {
    throw new Error(`${location}.expected.logicId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.observed.logicId)) {
    throw new Error(`${location}.observed.logicId must be a non-empty string.`);
  }
  assertReferenceSet(sample.expected.reference, `${location}.expected.reference`);
  assertReferenceSet(sample.observed.reference, `${location}.observed.reference`);
}

function roundTo2(value: number): number {
  return Number(value.toFixed(2));
}

export function evaluateModule02ReferenceAccuracy(
  samples: Module02ReferenceRuleSample[],
  evaluatedAt = new Date().toISOString()
): Module02ReferenceEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 02 evaluation requires at least one rule sample.");
  }

  const ruleResults = samples.map((sample, index) => {
    assertRuleSample(sample, index);

    const logicMatched = sample.expected.logicId === sample.observed.logicId;
    const referenceMatched = sameStringSet(
      sample.expected.reference.evidenceIds,
      sample.observed.reference.evidenceIds
    );
    const sourceKindsMatched = sameStringSet(
      sample.expected.reference.sourceKinds,
      sample.observed.reference.sourceKinds
    );
    const lineageMatched = sameOrderedList(
      sample.expected.reference.lineagePath,
      sample.observed.reference.lineagePath
    );

    return {
      ruleId: sample.ruleId,
      sampleId: sample.sampleId,
      logicMatched,
      referenceMatched,
      sourceKindsMatched,
      lineageMatched,
      passed: logicMatched && referenceMatched,
    };
  });

  const passedRuleCount = ruleResults.filter((result) => result.passed).length;
  const accuracyPercent = roundTo2((passedRuleCount / ruleResults.length) * 100);
  const minRuleCountSatisfied =
    ruleResults.length >= MODULE02_REFERENCE_ACCURACY_MIN_RULE_COUNT;
  const targetSatisfied = accuracyPercent >= MODULE02_REFERENCE_ACCURACY_TARGET_PERCENT;

  return {
    module: "02_data_lake",
    phase: "EVALUATION",
    kpiId: "kpi-05",
    formula: "Accuracy = 100 * (1/R) * sum(I(l_r == l_ref and f_r == f_ref))",
    evaluatedAt,
    ruleCount: ruleResults.length,
    passedRuleCount,
    accuracyPercent,
    targetPercent: MODULE02_REFERENCE_ACCURACY_TARGET_PERCENT,
    minRuleCount: MODULE02_REFERENCE_ACCURACY_MIN_RULE_COUNT,
    targetSatisfied,
    minRuleCountSatisfied,
    ruleResults,
  };
}
