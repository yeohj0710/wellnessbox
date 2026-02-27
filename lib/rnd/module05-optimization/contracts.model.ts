// RND: Module 05 Optimization Engine scaffold contracts.

export const RND_MODULE_05_NAME = "05_optimization_engine" as const;
export const RND_MODULE_05_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_05_OBJECTIVE_KEYS = ["efficacy", "risk", "cost"] as const;

export const RND_MODULE_05_SAFETY_DECISIONS = ["allow", "limit", "block"] as const;

export const RND_MODULE_05_REASON_CODES = [
  "goal_match",
  "safety_compliant",
  "efficacy_priority",
  "budget_fit",
  "dose_convenience",
] as const;

export type RndModule05ObjectiveKey = (typeof RND_MODULE_05_OBJECTIVE_KEYS)[number];
export type RndModule05SafetyDecision =
  (typeof RND_MODULE_05_SAFETY_DECISIONS)[number];
export type RndModule05ReasonCode = (typeof RND_MODULE_05_REASON_CODES)[number];

export type RndModule05UserProfile = {
  appUserIdHash: string;
  ageBand: string;
  sex: "female" | "male" | "other" | "unknown";
  healthGoals: string[];
  conditions: string[];
  medications: string[];
};

export type RndModule05CandidateItem = {
  itemId: string;
  productCode: string;
  ingredientCodes: string[];
  monthlyCostKrw: number;
  dailyDoseCount: number;
};

export type RndModule05EfficacySignal = {
  signalId: string;
  itemId: string;
  expectedBenefitScore: number;
  confidenceScore: number;
  sourceModelVersion: string;
};

export type RndModule05SafetyConstraint = {
  constraintId: string;
  ingredientCode: string;
  decision: RndModule05SafetyDecision;
  maxDailyIntakeMg: number | null;
  reason: string;
  sourceRuleIds: string[];
};

export type RndModule05Preference = {
  monthlyBudgetKrw: number;
  maxDailyDoseCount: number;
  preferredIngredientCodes: string[];
  avoidedIngredientCodes: string[];
};

export type RndModule05OptimizationInput = {
  caseId: string;
  module: typeof RND_MODULE_05_NAME;
  schemaVersion: typeof RND_MODULE_05_SCHEMA_VERSION;
  capturedAt: string;
  topK: number;
  profile: RndModule05UserProfile;
  candidates: RndModule05CandidateItem[];
  efficacySignals: RndModule05EfficacySignal[];
  safetyConstraints: RndModule05SafetyConstraint[];
  preference: RndModule05Preference;
};

export type RndModule05ObjectiveWeights = {
  efficacy: number;
  risk: number;
  cost: number;
};

export type RndModule05ScoreBreakdown = {
  efficacyComponent: number;
  riskComponent: number;
  costComponent: number;
  totalScore: number;
};

export type RndModule05Recommendation = {
  rank: number;
  comboId: string;
  itemIds: string[];
  ingredientCodes: string[];
  monthlyCostKrw: number;
  dailyDoseCount: number;
  safetyCompliant: boolean;
  blockedIngredientCodes: string[];
  score: RndModule05ScoreBreakdown;
  reasonCodes: RndModule05ReasonCode[];
};

export type RndModule05OptimizationOutput = {
  caseId: string;
  module: typeof RND_MODULE_05_NAME;
  schemaVersion: typeof RND_MODULE_05_SCHEMA_VERSION;
  generatedAt: string;
  topK: number;
  objectiveWeights: RndModule05ObjectiveWeights;
  recommendations: RndModule05Recommendation[];
};

export type RndModule05TraceLog = {
  traceId: string;
  caseId: string;
  comboId: string;
  step: string;
  detail: string;
  evidence: string[];
  loggedAt: string;
};
