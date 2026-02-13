// RND: Module 06 KPI #3/#4 closed-loop accuracy evaluation helpers.

import { isRndModule06NextActionType, type RndModule06NextActionType } from "./contracts";

export const MODULE06_ACTION_ACCURACY_MIN_CASE_COUNT = 100;
export const MODULE06_ACTION_ACCURACY_TARGET_PERCENT = 80;
export const MODULE06_LLM_ACCURACY_MIN_PROMPT_COUNT = 100;
export const MODULE06_LLM_ACCURACY_TARGET_PERCENT = 91;

export type Module06ActionAccuracySample = {
  sampleId: string;
  caseId: string;
  expectedActionType: RndModule06NextActionType;
  decidedActionType: RndModule06NextActionType;
  executionSuccess: boolean;
};

export type Module06ActionAccuracyCaseResult = {
  sampleId: string;
  caseId: string;
  expectedActionType: RndModule06NextActionType;
  decidedActionType: RndModule06NextActionType;
  executionSuccess: boolean;
  passed: boolean;
};

export type Module06ActionAccuracyEvaluationReport = {
  module: "06_closed_loop_ai";
  phase: "EVALUATION";
  kpiId: "kpi-03";
  formula: "Accuracy = 100 * sum(I(a_s == a_s* and e_s = 1)) / |S|";
  evaluatedAt: string;
  caseCount: number;
  passedCaseCount: number;
  accuracyPercent: number;
  targetPercent: number;
  minCaseCount: number;
  targetSatisfied: boolean;
  minCaseCountSatisfied: boolean;
  caseResults: Module06ActionAccuracyCaseResult[];
};

export type Module06LlmAccuracySample = {
  sampleId: string;
  promptId: string;
  expectedAnswerKey: string;
  responseAccepted: boolean;
};

export type Module06LlmAccuracyCaseResult = {
  sampleId: string;
  promptId: string;
  expectedAnswerKey: string;
  responseAccepted: boolean;
  passed: boolean;
};

export type Module06LlmAccuracyEvaluationReport = {
  module: "06_closed_loop_ai";
  phase: "EVALUATION";
  kpiId: "kpi-04";
  formula: "Accuracy = 100 * sum(g(answer_q)) / |Q|";
  evaluatedAt: string;
  promptCount: number;
  passedPromptCount: number;
  accuracyPercent: number;
  targetPercent: number;
  minPromptCount: number;
  targetSatisfied: boolean;
  minPromptCountSatisfied: boolean;
  caseResults: Module06LlmAccuracyCaseResult[];
};

export type Module06ClosedLoopEvaluationReport = {
  module: "06_closed_loop_ai";
  phase: "EVALUATION";
  evaluatedAt: string;
  actionAccuracyReport: Module06ActionAccuracyEvaluationReport;
  llmAccuracyReport: Module06LlmAccuracyEvaluationReport;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

function assertEvaluatedAt(evaluatedAt: string): void {
  if (!Number.isFinite(Date.parse(evaluatedAt))) {
    throw new Error("evaluatedAt must be a valid ISO datetime string.");
  }
}

function assertActionSample(sample: Module06ActionAccuracySample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.caseId)) {
    throw new Error(`${location}.caseId must be a non-empty string.`);
  }
  if (!isRndModule06NextActionType(sample.expectedActionType)) {
    throw new Error(`${location}.expectedActionType must be a valid next action type.`);
  }
  if (!isRndModule06NextActionType(sample.decidedActionType)) {
    throw new Error(`${location}.decidedActionType must be a valid next action type.`);
  }
  if (typeof sample.executionSuccess !== "boolean") {
    throw new Error(`${location}.executionSuccess must be a boolean.`);
  }
}

function assertLlmSample(sample: Module06LlmAccuracySample, index: number): void {
  const location = `samples[${index}]`;
  if (!isNonEmptyString(sample.sampleId)) {
    throw new Error(`${location}.sampleId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.promptId)) {
    throw new Error(`${location}.promptId must be a non-empty string.`);
  }
  if (!isNonEmptyString(sample.expectedAnswerKey)) {
    throw new Error(`${location}.expectedAnswerKey must be a non-empty string.`);
  }
  if (typeof sample.responseAccepted !== "boolean") {
    throw new Error(`${location}.responseAccepted must be a boolean.`);
  }
}

export function evaluateModule06ActionExecutionAccuracy(
  samples: Module06ActionAccuracySample[],
  evaluatedAt = new Date().toISOString()
): Module06ActionAccuracyEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 06 action evaluation requires at least one case sample.");
  }
  assertEvaluatedAt(evaluatedAt);

  const caseResults = samples.map((sample, index) => {
    assertActionSample(sample, index);
    const passed =
      sample.expectedActionType === sample.decidedActionType && sample.executionSuccess;
    return {
      sampleId: sample.sampleId,
      caseId: sample.caseId,
      expectedActionType: sample.expectedActionType,
      decidedActionType: sample.decidedActionType,
      executionSuccess: sample.executionSuccess,
      passed,
    };
  });

  const passedCaseCount = caseResults.filter((result) => result.passed).length;
  const accuracyPercent = roundTo((passedCaseCount / caseResults.length) * 100, 2);
  const minCaseCountSatisfied =
    caseResults.length >= MODULE06_ACTION_ACCURACY_MIN_CASE_COUNT;
  const targetSatisfied = accuracyPercent >= MODULE06_ACTION_ACCURACY_TARGET_PERCENT;

  return {
    module: "06_closed_loop_ai",
    phase: "EVALUATION",
    kpiId: "kpi-03",
    formula: "Accuracy = 100 * sum(I(a_s == a_s* and e_s = 1)) / |S|",
    evaluatedAt,
    caseCount: caseResults.length,
    passedCaseCount,
    accuracyPercent,
    targetPercent: MODULE06_ACTION_ACCURACY_TARGET_PERCENT,
    minCaseCount: MODULE06_ACTION_ACCURACY_MIN_CASE_COUNT,
    targetSatisfied,
    minCaseCountSatisfied,
    caseResults,
  };
}

export function evaluateModule06LlmAnswerAccuracy(
  samples: Module06LlmAccuracySample[],
  evaluatedAt = new Date().toISOString()
): Module06LlmAccuracyEvaluationReport {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Module 06 LLM evaluation requires at least one prompt sample.");
  }
  assertEvaluatedAt(evaluatedAt);

  const caseResults = samples.map((sample, index) => {
    assertLlmSample(sample, index);
    return {
      sampleId: sample.sampleId,
      promptId: sample.promptId,
      expectedAnswerKey: sample.expectedAnswerKey,
      responseAccepted: sample.responseAccepted,
      passed: sample.responseAccepted,
    };
  });

  const passedPromptCount = caseResults.filter((result) => result.passed).length;
  const accuracyPercent = roundTo((passedPromptCount / caseResults.length) * 100, 2);
  const minPromptCountSatisfied =
    caseResults.length >= MODULE06_LLM_ACCURACY_MIN_PROMPT_COUNT;
  const targetSatisfied = accuracyPercent >= MODULE06_LLM_ACCURACY_TARGET_PERCENT;

  return {
    module: "06_closed_loop_ai",
    phase: "EVALUATION",
    kpiId: "kpi-04",
    formula: "Accuracy = 100 * sum(g(answer_q)) / |Q|",
    evaluatedAt,
    promptCount: caseResults.length,
    passedPromptCount,
    accuracyPercent,
    targetPercent: MODULE06_LLM_ACCURACY_TARGET_PERCENT,
    minPromptCount: MODULE06_LLM_ACCURACY_MIN_PROMPT_COUNT,
    targetSatisfied,
    minPromptCountSatisfied,
    caseResults,
  };
}

export function evaluateModule06ClosedLoopAccuracy(
  actionSamples: Module06ActionAccuracySample[],
  llmSamples: Module06LlmAccuracySample[],
  evaluatedAt = new Date().toISOString()
): Module06ClosedLoopEvaluationReport {
  assertEvaluatedAt(evaluatedAt);
  const actionAccuracyReport = evaluateModule06ActionExecutionAccuracy(
    actionSamples,
    evaluatedAt
  );
  const llmAccuracyReport = evaluateModule06LlmAnswerAccuracy(llmSamples, evaluatedAt);

  return {
    module: "06_closed_loop_ai",
    phase: "EVALUATION",
    evaluatedAt,
    actionAccuracyReport,
    llmAccuracyReport,
  };
}
