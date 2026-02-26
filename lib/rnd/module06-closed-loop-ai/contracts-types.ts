// RND: Module 06 Closed-loop AI scaffold contracts (types and enums).

export const RND_MODULE_06_NAME = "06_closed_loop_ai" as const;
export const RND_MODULE_06_SCHEMA_VERSION = "2026-02-scaffold-v1" as const;

export const RND_MODULE_06_NEXT_ACTION_TYPES = [
  "maintain",
  "adjust",
  "stop",
  "request_info",
  "escalate_consult",
  "monitor",
] as const;

export const RND_MODULE_06_EXECUTION_CHANNELS = [
  "notification",
  "consultation",
  "recommendation",
  "task_queue",
] as const;

export const RND_MODULE_06_EXECUTION_STATUSES = [
  "success",
  "failed",
  "skipped",
] as const;

export const RND_MODULE_06_INTERACTION_EVENT_TYPES = [
  "consultation",
  "purchase",
  "repurchase",
  "adherence",
  "discontinue",
  "notification_response",
] as const;

export const RND_MODULE_06_BIOSENSOR_SOURCES = [
  "wearable",
  "continuous_glucose",
  "genetic",
] as const;

export const RND_MODULE_06_RISK_LEVELS = ["low", "medium", "high"] as const;

export const RND_MODULE_06_EVIDENCE_SOURCES = [
  "data_lake",
  "safety_engine",
  "efficacy_model",
  "optimization_engine",
  "consultation_log",
] as const;

export type RndModule06NextActionType =
  (typeof RND_MODULE_06_NEXT_ACTION_TYPES)[number];
export type RndModule06ExecutionChannel =
  (typeof RND_MODULE_06_EXECUTION_CHANNELS)[number];
export type RndModule06ExecutionStatus =
  (typeof RND_MODULE_06_EXECUTION_STATUSES)[number];
export type RndModule06InteractionEventType =
  (typeof RND_MODULE_06_INTERACTION_EVENT_TYPES)[number];
export type RndModule06BiosensorSource =
  (typeof RND_MODULE_06_BIOSENSOR_SOURCES)[number];
export type RndModule06RiskLevel = (typeof RND_MODULE_06_RISK_LEVELS)[number];
export type RndModule06EvidenceSource =
  (typeof RND_MODULE_06_EVIDENCE_SOURCES)[number];

export type RndModule06UserProfile = {
  appUserIdHash: string;
  ageBand: string;
  sex: "female" | "male" | "other" | "unknown";
  healthGoals: string[];
  conditions: string[];
  medications: string[];
  allergies: string[];
};

export type RndModule06EfficacySnapshot = {
  evaluationId: string;
  deltaScore: number;
  improvementPp: number;
  measuredAt: string;
};

export type RndModule06SafetySnapshot = {
  safetyCaseId: string;
  riskLevel: RndModule06RiskLevel;
  prohibitedIngredientCodes: string[];
  blockedRuleIds: string[];
  evaluatedAt: string;
};

export type RndModule06OptimizationSelection = {
  optimizationRunId: string;
  recommendedComboId: string;
  selectedComboId: string | null;
  selectionChanged: boolean;
  selectedAt: string;
};

export type RndModule06InteractionEvent = {
  eventId: string;
  eventType: RndModule06InteractionEventType;
  summary: string;
  relatedIds: string[];
  occurredAt: string;
};

export type RndModule06BiosensorObservation = {
  observationId: string;
  source: RndModule06BiosensorSource;
  metricKey: string;
  value: number;
  unit: string;
  observedAt: string;
};

export type RndModule06LoopInput = {
  caseId: string;
  module: typeof RND_MODULE_06_NAME;
  schemaVersion: typeof RND_MODULE_06_SCHEMA_VERSION;
  capturedAt: string;
  profile: RndModule06UserProfile;
  efficacy: RndModule06EfficacySnapshot;
  safety: RndModule06SafetySnapshot;
  optimization: RndModule06OptimizationSelection;
  interactionEvents: RndModule06InteractionEvent[];
  biosensorObservations: RndModule06BiosensorObservation[];
};

export type RndModule06ConsultationPrompt = {
  promptId: string;
  caseId: string;
  question: string;
  contextSummary: string;
  expectedAnswerKey: string;
};

export type RndModule06NextActionDecision = {
  decisionId: string;
  caseId: string;
  actionType: RndModule06NextActionType;
  rationale: string;
  evidenceIds: string[];
  decidedAt: string;
};

export type RndModule06ExecutionRecord = {
  executionId: string;
  decisionId: string;
  caseId: string;
  actionType: RndModule06NextActionType;
  channel: RndModule06ExecutionChannel;
  status: RndModule06ExecutionStatus;
  detail: string;
  requestedAt: string;
  completedAt: string | null;
};

export type RndModule06EvidenceRef = {
  source: RndModule06EvidenceSource;
  refId: string;
};

export type RndModule06ConsultationResponse = {
  responseId: string;
  promptId: string;
  caseId: string;
  answer: string;
  evidenceRefs: RndModule06EvidenceRef[];
  respondedAt: string;
};

export type RndModule06ActionEvaluationLog = {
  caseId: string;
  expectedActionType: RndModule06NextActionType;
  decidedActionType: RndModule06NextActionType;
  executionSuccess: boolean;
  loggedAt: string;
};

export type RndModule06LlmEvaluationLog = {
  promptId: string;
  expectedAnswerKey: string;
  responseAccepted: boolean;
  judgedAt: string;
};

export type RndModule06ClosedLoopOutput = {
  runId: string;
  module: typeof RND_MODULE_06_NAME;
  schemaVersion: typeof RND_MODULE_06_SCHEMA_VERSION;
  generatedAt: string;
  decisions: RndModule06NextActionDecision[];
  executions: RndModule06ExecutionRecord[];
  consultationResponses: RndModule06ConsultationResponse[];
  actionEvaluationLogs: RndModule06ActionEvaluationLog[];
  llmEvaluationLogs: RndModule06LlmEvaluationLog[];
};
