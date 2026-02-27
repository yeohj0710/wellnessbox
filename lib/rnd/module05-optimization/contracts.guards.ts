import {
  RND_MODULE_05_NAME,
  RND_MODULE_05_OBJECTIVE_KEYS,
  RND_MODULE_05_REASON_CODES,
  RND_MODULE_05_SAFETY_DECISIONS,
  RND_MODULE_05_SCHEMA_VERSION,
  type RndModule05CandidateItem,
  type RndModule05EfficacySignal,
  type RndModule05ObjectiveKey,
  type RndModule05ObjectiveWeights,
  type RndModule05OptimizationInput,
  type RndModule05OptimizationOutput,
  type RndModule05Preference,
  type RndModule05ReasonCode,
  type RndModule05Recommendation,
  type RndModule05SafetyConstraint,
  type RndModule05SafetyDecision,
  type RndModule05ScoreBreakdown,
  type RndModule05TraceLog,
  type RndModule05UserProfile,
} from "@/lib/rnd/module05-optimization/contracts.model";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRateBetweenZeroAndOne(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function isRndModule05ObjectiveKey(
  value: unknown
): value is RndModule05ObjectiveKey {
  return (
    typeof value === "string" &&
    (RND_MODULE_05_OBJECTIVE_KEYS as readonly string[]).includes(value)
  );
}

export function isRndModule05SafetyDecision(
  value: unknown
): value is RndModule05SafetyDecision {
  return (
    typeof value === "string" &&
    (RND_MODULE_05_SAFETY_DECISIONS as readonly string[]).includes(value)
  );
}

export function isRndModule05ReasonCode(
  value: unknown
): value is RndModule05ReasonCode {
  return (
    typeof value === "string" &&
    (RND_MODULE_05_REASON_CODES as readonly string[]).includes(value)
  );
}

export function isRndModule05UserProfile(
  value: unknown
): value is RndModule05UserProfile {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.appUserIdHash)) return false;
  if (!isNonEmptyString(value.ageBand)) return false;
  if (
    value.sex !== "female" &&
    value.sex !== "male" &&
    value.sex !== "other" &&
    value.sex !== "unknown"
  ) {
    return false;
  }
  if (!isStringArray(value.healthGoals)) return false;
  if (!isStringArray(value.conditions)) return false;
  if (!isStringArray(value.medications)) return false;
  return true;
}

export function isRndModule05CandidateItem(
  value: unknown
): value is RndModule05CandidateItem {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.itemId)) return false;
  if (!isNonEmptyString(value.productCode)) return false;
  if (!isStringArray(value.ingredientCodes) || value.ingredientCodes.length === 0) {
    return false;
  }
  if (!isNonNegativeNumber(value.monthlyCostKrw)) return false;
  if (!isPositiveInteger(value.dailyDoseCount)) return false;
  return true;
}

export function isRndModule05EfficacySignal(
  value: unknown
): value is RndModule05EfficacySignal {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.signalId)) return false;
  if (!isNonEmptyString(value.itemId)) return false;
  if (!isRateBetweenZeroAndOne(value.expectedBenefitScore)) return false;
  if (!isRateBetweenZeroAndOne(value.confidenceScore)) return false;
  if (!isNonEmptyString(value.sourceModelVersion)) return false;
  return true;
}

export function isRndModule05SafetyConstraint(
  value: unknown
): value is RndModule05SafetyConstraint {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.constraintId)) return false;
  if (!isNonEmptyString(value.ingredientCode)) return false;
  if (!isRndModule05SafetyDecision(value.decision)) return false;
  if (
    value.maxDailyIntakeMg !== null &&
    !isNonNegativeNumber(value.maxDailyIntakeMg)
  ) {
    return false;
  }
  if (!isNonEmptyString(value.reason)) return false;
  if (!isStringArray(value.sourceRuleIds) || value.sourceRuleIds.length === 0) return false;
  if (value.decision === "limit" && value.maxDailyIntakeMg === null) return false;
  if (value.decision === "block" && value.maxDailyIntakeMg !== null) return false;
  return true;
}

export function isRndModule05Preference(
  value: unknown
): value is RndModule05Preference {
  if (!isObject(value)) return false;
  if (!isNonNegativeNumber(value.monthlyBudgetKrw)) return false;
  if (!isPositiveInteger(value.maxDailyDoseCount)) return false;
  if (!isStringArray(value.preferredIngredientCodes)) return false;
  if (!isStringArray(value.avoidedIngredientCodes)) return false;
  return true;
}

export function isRndModule05OptimizationInput(
  value: unknown
): value is RndModule05OptimizationInput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_05_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_05_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isPositiveInteger(value.topK)) return false;
  if (!isRndModule05UserProfile(value.profile)) return false;
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) return false;
  if (!value.candidates.every((item) => isRndModule05CandidateItem(item))) return false;
  if (!Array.isArray(value.efficacySignals) || value.efficacySignals.length === 0) {
    return false;
  }
  if (!value.efficacySignals.every((signal) => isRndModule05EfficacySignal(signal))) {
    return false;
  }
  if (!Array.isArray(value.safetyConstraints) || value.safetyConstraints.length === 0) {
    return false;
  }
  if (
    !value.safetyConstraints.every((constraint) =>
      isRndModule05SafetyConstraint(constraint)
    )
  ) {
    return false;
  }
  if (!isRndModule05Preference(value.preference)) return false;
  return true;
}

export function assertRndModule05OptimizationInput(
  value: unknown
): asserts value is RndModule05OptimizationInput {
  if (!isRndModule05OptimizationInput(value)) {
    throw new Error("Invalid Module 05 optimization input payload.");
  }
}

function isRndModule05ObjectiveWeights(
  value: unknown
): value is RndModule05ObjectiveWeights {
  if (!isObject(value)) return false;
  if (!isRateBetweenZeroAndOne(value.efficacy)) return false;
  if (!isRateBetweenZeroAndOne(value.risk)) return false;
  if (!isRateBetweenZeroAndOne(value.cost)) return false;
  const sum = value.efficacy + value.risk + value.cost;
  if (Math.abs(sum - 1) > 1e-6) return false;
  return true;
}

function isRndModule05ScoreBreakdown(
  value: unknown
): value is RndModule05ScoreBreakdown {
  if (!isObject(value)) return false;
  if (!isRateBetweenZeroAndOne(value.efficacyComponent)) return false;
  if (!isRateBetweenZeroAndOne(value.riskComponent)) return false;
  if (!isRateBetweenZeroAndOne(value.costComponent)) return false;
  if (!isRateBetweenZeroAndOne(value.totalScore)) return false;
  return true;
}

function isRndModule05Recommendation(
  value: unknown
): value is RndModule05Recommendation {
  if (!isObject(value)) return false;
  if (!isPositiveInteger(value.rank)) return false;
  if (!isNonEmptyString(value.comboId)) return false;
  if (!isStringArray(value.itemIds) || value.itemIds.length === 0) return false;
  if (!isStringArray(value.ingredientCodes) || value.ingredientCodes.length === 0) {
    return false;
  }
  if (!isNonNegativeNumber(value.monthlyCostKrw)) return false;
  if (!isPositiveInteger(value.dailyDoseCount)) return false;
  if (typeof value.safetyCompliant !== "boolean") return false;
  if (!isStringArray(value.blockedIngredientCodes)) return false;
  if (!isRndModule05ScoreBreakdown(value.score)) return false;
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length === 0) return false;
  if (!value.reasonCodes.every((reasonCode) => isRndModule05ReasonCode(reasonCode))) {
    return false;
  }
  if (value.safetyCompliant && value.blockedIngredientCodes.length > 0) return false;
  return true;
}

export function isRndModule05OptimizationOutput(
  value: unknown
): value is RndModule05OptimizationOutput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_05_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_05_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  if (!isPositiveInteger(value.topK)) return false;
  if (!isRndModule05ObjectiveWeights(value.objectiveWeights)) return false;
  if (!Array.isArray(value.recommendations) || value.recommendations.length === 0) {
    return false;
  }
  if (!value.recommendations.every((recommendation) => isRndModule05Recommendation(recommendation))) {
    return false;
  }
  if (value.recommendations.length > value.topK) return false;
  return true;
}

export function assertRndModule05OptimizationOutput(
  value: unknown
): asserts value is RndModule05OptimizationOutput {
  if (!isRndModule05OptimizationOutput(value)) {
    throw new Error("Invalid Module 05 optimization output payload.");
  }
}

export function isRndModule05TraceLog(value: unknown): value is RndModule05TraceLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.traceId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isNonEmptyString(value.comboId)) return false;
  if (!isNonEmptyString(value.step)) return false;
  if (!isNonEmptyString(value.detail)) return false;
  if (!isStringArray(value.evidence)) return false;
  if (!isIsoDateTime(value.loggedAt)) return false;
  return true;
}

export function assertRndModule05TraceLog(
  value: unknown
): asserts value is RndModule05TraceLog {
  if (!isRndModule05TraceLog(value)) {
    throw new Error("Invalid Module 05 trace-log payload.");
  }
}
