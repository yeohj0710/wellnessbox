import {
  RND_MODULE_03_DECISIONS,
  RND_MODULE_03_NAME,
  RND_MODULE_03_REFERENCE_SOURCES,
  RND_MODULE_03_RULE_KINDS,
  RND_MODULE_03_SCHEMA_VERSION,
  type RndModule03AppliedRuleResult,
  type RndModule03CandidateIngredient,
  type RndModule03Decision,
  type RndModule03ReferenceSource,
  type RndModule03RuleKind,
  type RndModule03RuleReference,
  type RndModule03RuleThreshold,
  type RndModule03RuleTriggers,
  type RndModule03SafetyOutput,
  type RndModule03SafetyRange,
  type RndModule03SafetyRule,
  type RndModule03TraceLog,
  type RndModule03UserProfile,
  type RndModule03ValidationInput,
} from "@/lib/rnd/module03-personal-safety/contracts.model";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isRndModule03RuleKind(value: unknown): value is RndModule03RuleKind {
  return (
    typeof value === "string" &&
    (RND_MODULE_03_RULE_KINDS as readonly string[]).includes(value)
  );
}

export function isRndModule03ReferenceSource(
  value: unknown
): value is RndModule03ReferenceSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_03_REFERENCE_SOURCES as readonly string[]).includes(value)
  );
}

export function isRndModule03Decision(value: unknown): value is RndModule03Decision {
  return (
    typeof value === "string" &&
    (RND_MODULE_03_DECISIONS as readonly string[]).includes(value)
  );
}

export function isRndModule03UserProfile(
  value: unknown
): value is RndModule03UserProfile {
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
  if (!isStringArray(value.medications)) return false;
  if (!isStringArray(value.conditions)) return false;
  if (!isStringArray(value.allergies)) return false;
  if (!isStringArray(value.lifestyleTags)) return false;
  if (!isStringArray(value.healthGoals)) return false;
  return true;
}

export function isRndModule03CandidateIngredient(
  value: unknown
): value is RndModule03CandidateIngredient {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.ingredientCode)) return false;
  if (!isPositiveNumber(value.dailyIntakeMg)) return false;
  return true;
}

export function isRndModule03ValidationInput(
  value: unknown
): value is RndModule03ValidationInput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_03_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_03_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isRndModule03UserProfile(value.profile)) return false;
  if (!Array.isArray(value.candidates) || value.candidates.length === 0) return false;
  if (!value.candidates.every((item) => isRndModule03CandidateIngredient(item))) {
    return false;
  }
  return true;
}

export function assertRndModule03ValidationInput(
  value: unknown
): asserts value is RndModule03ValidationInput {
  if (!isRndModule03ValidationInput(value)) {
    throw new Error("Invalid Module 03 validation input payload.");
  }
}

export function isRndModule03RuleReference(
  value: unknown
): value is RndModule03RuleReference {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.referenceId)) return false;
  if (!isRndModule03ReferenceSource(value.source)) return false;
  if (!isNonEmptyString(value.sourceRef)) return false;
  if (!isNonEmptyString(value.summary)) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  return true;
}

export function assertRndModule03RuleReference(
  value: unknown
): asserts value is RndModule03RuleReference {
  if (!isRndModule03RuleReference(value)) {
    throw new Error("Invalid Module 03 rule reference payload.");
  }
}

function isRndModule03RuleTriggers(value: unknown): value is RndModule03RuleTriggers {
  if (!isObject(value)) return false;
  if (value.medications !== undefined && !isStringArray(value.medications)) return false;
  if (value.conditions !== undefined && !isStringArray(value.conditions)) return false;
  if (value.allergies !== undefined && !isStringArray(value.allergies)) return false;
  return true;
}

function isRndModule03RuleThreshold(value: unknown): value is RndModule03RuleThreshold {
  if (!isObject(value)) return false;
  if (
    value.maxDailyIntakeMg !== undefined &&
    !isPositiveNumber(value.maxDailyIntakeMg)
  ) {
    return false;
  }
  return true;
}

export function isRndModule03SafetyRule(value: unknown): value is RndModule03SafetyRule {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.ruleId)) return false;
  if (!isRndModule03RuleKind(value.kind)) return false;
  if (!isNonEmptyString(value.ingredientCode)) return false;
  if (!isRndModule03RuleTriggers(value.triggers)) return false;
  if (value.threshold !== undefined && !isRndModule03RuleThreshold(value.threshold)) {
    return false;
  }
  if (!isStringArray(value.referenceIds) || value.referenceIds.length === 0) return false;
  if (typeof value.priority !== "number") return false;
  if (!Number.isInteger(value.priority) || value.priority < 1) return false;
  if (typeof value.active !== "boolean") return false;
  return true;
}

export function assertRndModule03SafetyRule(
  value: unknown
): asserts value is RndModule03SafetyRule {
  if (!isRndModule03SafetyRule(value)) {
    throw new Error("Invalid Module 03 safety rule payload.");
  }
}

export function isRndModule03AppliedRuleResult(
  value: unknown
): value is RndModule03AppliedRuleResult {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.resultId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isNonEmptyString(value.ruleId)) return false;
  if (!isNonEmptyString(value.ingredientCode)) return false;
  if (!isRndModule03Decision(value.decision)) return false;
  if (typeof value.violation !== "boolean") return false;
  if (!isNonEmptyString(value.reason)) return false;
  if (!isStringArray(value.referenceIds) || value.referenceIds.length === 0) return false;
  if (!isIsoDateTime(value.evaluatedAt)) return false;
  return true;
}

export function assertRndModule03AppliedRuleResult(
  value: unknown
): asserts value is RndModule03AppliedRuleResult {
  if (!isRndModule03AppliedRuleResult(value)) {
    throw new Error("Invalid Module 03 applied-rule result payload.");
  }
}

function isRndModule03SafetyRange(value: unknown): value is RndModule03SafetyRange {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.ingredientCode)) return false;
  if (value.allowedDailyIntakeMg !== null) {
    if (!isObject(value.allowedDailyIntakeMg)) return false;
    const { min, max } = value.allowedDailyIntakeMg;
    if (!isNonNegativeNumber(min)) return false;
    if (!isPositiveNumber(max)) return false;
    if (min > max) return false;
  }
  if (typeof value.prohibited !== "boolean") return false;
  if (!isStringArray(value.blockedReasons)) return false;
  if (!isStringArray(value.blockedRuleIds)) return false;
  return true;
}

export function isRndModule03SafetyOutput(value: unknown): value is RndModule03SafetyOutput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_03_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_03_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  if (!Array.isArray(value.ranges) || value.ranges.length === 0) return false;
  if (!value.ranges.every((item) => isRndModule03SafetyRange(item))) return false;
  if (!isStringArray(value.prohibitedIngredients)) return false;
  if (!isStringArray(value.prohibitedRules)) return false;
  return true;
}

export function assertRndModule03SafetyOutput(
  value: unknown
): asserts value is RndModule03SafetyOutput {
  if (!isRndModule03SafetyOutput(value)) {
    throw new Error("Invalid Module 03 safety-output payload.");
  }
}

export function isRndModule03TraceLog(value: unknown): value is RndModule03TraceLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.traceId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isNonEmptyString(value.resultId)) return false;
  if (!isNonEmptyString(value.ruleId)) return false;
  if (!isStringArray(value.referenceIds) || value.referenceIds.length === 0) return false;
  if (!isNonEmptyString(value.summary)) return false;
  if (!isIsoDateTime(value.loggedAt)) return false;
  return true;
}

export function assertRndModule03TraceLog(
  value: unknown
): asserts value is RndModule03TraceLog {
  if (!isRndModule03TraceLog(value)) {
    throw new Error("Invalid Module 03 trace-log payload.");
  }
}
