// RND: Module 03 Personal Safety Validation Engine scaffold contracts.

export const RND_MODULE_03_NAME = "03_personal_safety_validation_engine" as const;
export const RND_MODULE_03_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_03_RULE_KINDS = [
  "contraindication",
  "interaction",
  "overdose",
  "caution",
] as const;

export const RND_MODULE_03_REFERENCE_SOURCES = [
  "medical_database",
  "journal",
  "regulatory_guideline",
  "internal_policy",
] as const;

export const RND_MODULE_03_DECISIONS = ["allow", "limit", "block"] as const;

export type RndModule03RuleKind = (typeof RND_MODULE_03_RULE_KINDS)[number];
export type RndModule03ReferenceSource =
  (typeof RND_MODULE_03_REFERENCE_SOURCES)[number];
export type RndModule03Decision = (typeof RND_MODULE_03_DECISIONS)[number];

export type RndModule03UserProfile = {
  appUserIdHash: string;
  ageBand: string;
  sex: "female" | "male" | "other" | "unknown";
  medications: string[];
  conditions: string[];
  allergies: string[];
  lifestyleTags: string[];
  healthGoals: string[];
};

export type RndModule03CandidateIngredient = {
  ingredientCode: string;
  dailyIntakeMg: number;
};

export type RndModule03ValidationInput = {
  caseId: string;
  module: typeof RND_MODULE_03_NAME;
  schemaVersion: typeof RND_MODULE_03_SCHEMA_VERSION;
  capturedAt: string;
  profile: RndModule03UserProfile;
  candidates: RndModule03CandidateIngredient[];
};

export type RndModule03RuleReference = {
  referenceId: string;
  source: RndModule03ReferenceSource;
  sourceRef: string;
  summary: string;
  capturedAt: string;
};

export type RndModule03RuleTriggers = {
  medications?: string[];
  conditions?: string[];
  allergies?: string[];
};

export type RndModule03RuleThreshold = {
  maxDailyIntakeMg?: number;
};

export type RndModule03SafetyRule = {
  ruleId: string;
  kind: RndModule03RuleKind;
  ingredientCode: string;
  triggers: RndModule03RuleTriggers;
  threshold?: RndModule03RuleThreshold;
  referenceIds: string[];
  priority: number;
  active: boolean;
};

export type RndModule03AppliedRuleResult = {
  resultId: string;
  caseId: string;
  ruleId: string;
  ingredientCode: string;
  decision: RndModule03Decision;
  violation: boolean;
  reason: string;
  referenceIds: string[];
  evaluatedAt: string;
};

export type RndModule03SafetyRange = {
  ingredientCode: string;
  allowedDailyIntakeMg: { min: number; max: number } | null;
  prohibited: boolean;
  blockedReasons: string[];
  blockedRuleIds: string[];
};

export type RndModule03SafetyOutput = {
  caseId: string;
  module: typeof RND_MODULE_03_NAME;
  schemaVersion: typeof RND_MODULE_03_SCHEMA_VERSION;
  generatedAt: string;
  ranges: RndModule03SafetyRange[];
  prohibitedIngredients: string[];
  prohibitedRules: string[];
};

export type RndModule03TraceLog = {
  traceId: string;
  caseId: string;
  resultId: string;
  ruleId: string;
  referenceIds: string[];
  summary: string;
  loggedAt: string;
};

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
