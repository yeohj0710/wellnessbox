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
