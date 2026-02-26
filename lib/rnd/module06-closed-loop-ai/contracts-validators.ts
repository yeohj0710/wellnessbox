import {
  RND_MODULE_06_BIOSENSOR_SOURCES,
  RND_MODULE_06_EVIDENCE_SOURCES,
  RND_MODULE_06_EXECUTION_CHANNELS,
  RND_MODULE_06_EXECUTION_STATUSES,
  RND_MODULE_06_INTERACTION_EVENT_TYPES,
  RND_MODULE_06_NAME,
  RND_MODULE_06_NEXT_ACTION_TYPES,
  RND_MODULE_06_RISK_LEVELS,
  RND_MODULE_06_SCHEMA_VERSION,
  type RndModule06ActionEvaluationLog,
  type RndModule06BiosensorObservation,
  type RndModule06BiosensorSource,
  type RndModule06ClosedLoopOutput,
  type RndModule06ConsultationPrompt,
  type RndModule06ConsultationResponse,
  type RndModule06EfficacySnapshot,
  type RndModule06EvidenceRef,
  type RndModule06EvidenceSource,
  type RndModule06ExecutionChannel,
  type RndModule06ExecutionRecord,
  type RndModule06ExecutionStatus,
  type RndModule06InteractionEvent,
  type RndModule06InteractionEventType,
  type RndModule06LlmEvaluationLog,
  type RndModule06LoopInput,
  type RndModule06NextActionDecision,
  type RndModule06NextActionType,
  type RndModule06OptimizationSelection,
  type RndModule06RiskLevel,
  type RndModule06SafetySnapshot,
  type RndModule06UserProfile,
} from "./contracts-types";

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

export function isRndModule06NextActionType(
  value: unknown
): value is RndModule06NextActionType {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_NEXT_ACTION_TYPES as readonly string[]).includes(value)
  );
}

export function isRndModule06ExecutionChannel(
  value: unknown
): value is RndModule06ExecutionChannel {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EXECUTION_CHANNELS as readonly string[]).includes(value)
  );
}

export function isRndModule06ExecutionStatus(
  value: unknown
): value is RndModule06ExecutionStatus {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EXECUTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isRndModule06InteractionEventType(
  value: unknown
): value is RndModule06InteractionEventType {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_INTERACTION_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isRndModule06BiosensorSource(
  value: unknown
): value is RndModule06BiosensorSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_BIOSENSOR_SOURCES as readonly string[]).includes(value)
  );
}

export function isRndModule06RiskLevel(value: unknown): value is RndModule06RiskLevel {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_RISK_LEVELS as readonly string[]).includes(value)
  );
}

export function isRndModule06EvidenceSource(
  value: unknown
): value is RndModule06EvidenceSource {
  return (
    typeof value === "string" &&
    (RND_MODULE_06_EVIDENCE_SOURCES as readonly string[]).includes(value)
  );
}

export function isRndModule06UserProfile(
  value: unknown
): value is RndModule06UserProfile {
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
  if (!isStringArray(value.allergies)) return false;
  return true;
}

export function isRndModule06EfficacySnapshot(
  value: unknown
): value is RndModule06EfficacySnapshot {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.evaluationId)) return false;
  if (!isFiniteNumber(value.deltaScore)) return false;
  if (!isFiniteNumber(value.improvementPp)) return false;
  if (!isIsoDateTime(value.measuredAt)) return false;
  return true;
}

export function isRndModule06SafetySnapshot(
  value: unknown
): value is RndModule06SafetySnapshot {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.safetyCaseId)) return false;
  if (!isRndModule06RiskLevel(value.riskLevel)) return false;
  if (!isStringArray(value.prohibitedIngredientCodes)) return false;
  if (!isStringArray(value.blockedRuleIds)) return false;
  if (!isIsoDateTime(value.evaluatedAt)) return false;
  return true;
}

export function isRndModule06OptimizationSelection(
  value: unknown
): value is RndModule06OptimizationSelection {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.optimizationRunId)) return false;
  if (!isNonEmptyString(value.recommendedComboId)) return false;
  if (value.selectedComboId !== null && !isNonEmptyString(value.selectedComboId)) {
    return false;
  }
  if (typeof value.selectionChanged !== "boolean") return false;
  if (!isIsoDateTime(value.selectedAt)) return false;
  return true;
}

export function isRndModule06InteractionEvent(
  value: unknown
): value is RndModule06InteractionEvent {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.eventId)) return false;
  if (!isRndModule06InteractionEventType(value.eventType)) return false;
  if (!isNonEmptyString(value.summary)) return false;
  if (!isStringArray(value.relatedIds)) return false;
  if (!isIsoDateTime(value.occurredAt)) return false;
  return true;
}

export function isRndModule06BiosensorObservation(
  value: unknown
): value is RndModule06BiosensorObservation {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.observationId)) return false;
  if (!isRndModule06BiosensorSource(value.source)) return false;
  if (!isNonEmptyString(value.metricKey)) return false;
  if (!isFiniteNumber(value.value)) return false;
  if (!isNonEmptyString(value.unit)) return false;
  if (!isIsoDateTime(value.observedAt)) return false;
  return true;
}

export function isRndModule06LoopInput(value: unknown): value is RndModule06LoopInput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (value.module !== RND_MODULE_06_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_06_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.capturedAt)) return false;
  if (!isRndModule06UserProfile(value.profile)) return false;
  if (!isRndModule06EfficacySnapshot(value.efficacy)) return false;
  if (!isRndModule06SafetySnapshot(value.safety)) return false;
  if (!isRndModule06OptimizationSelection(value.optimization)) return false;
  if (!Array.isArray(value.interactionEvents) || value.interactionEvents.length === 0) {
    return false;
  }
  if (!value.interactionEvents.every((event) => isRndModule06InteractionEvent(event))) {
    return false;
  }
  if (!Array.isArray(value.biosensorObservations)) return false;
  if (
    !value.biosensorObservations.every((observation) =>
      isRndModule06BiosensorObservation(observation)
    )
  ) {
    return false;
  }
  return true;
}

export function assertRndModule06LoopInput(
  value: unknown
): asserts value is RndModule06LoopInput {
  if (!isRndModule06LoopInput(value)) {
    throw new Error("Invalid Module 06 loop input payload.");
  }
}

export function isRndModule06ConsultationPrompt(
  value: unknown
): value is RndModule06ConsultationPrompt {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.promptId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isNonEmptyString(value.question)) return false;
  if (!isNonEmptyString(value.contextSummary)) return false;
  if (!isNonEmptyString(value.expectedAnswerKey)) return false;
  return true;
}

export function assertRndModule06ConsultationPrompt(
  value: unknown
): asserts value is RndModule06ConsultationPrompt {
  if (!isRndModule06ConsultationPrompt(value)) {
    throw new Error("Invalid Module 06 consultation prompt payload.");
  }
}

export function isRndModule06NextActionDecision(
  value: unknown
): value is RndModule06NextActionDecision {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.decisionId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isRndModule06NextActionType(value.actionType)) return false;
  if (!isNonEmptyString(value.rationale)) return false;
  if (!isStringArray(value.evidenceIds) || value.evidenceIds.length === 0) return false;
  if (!isIsoDateTime(value.decidedAt)) return false;
  return true;
}

export function assertRndModule06NextActionDecision(
  value: unknown
): asserts value is RndModule06NextActionDecision {
  if (!isRndModule06NextActionDecision(value)) {
    throw new Error("Invalid Module 06 next-action decision payload.");
  }
}

export function isRndModule06ExecutionRecord(
  value: unknown
): value is RndModule06ExecutionRecord {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.executionId)) return false;
  if (!isNonEmptyString(value.decisionId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isRndModule06NextActionType(value.actionType)) return false;
  if (!isRndModule06ExecutionChannel(value.channel)) return false;
  if (!isRndModule06ExecutionStatus(value.status)) return false;
  if (!isNonEmptyString(value.detail)) return false;
  if (!isIsoDateTime(value.requestedAt)) return false;
  if (value.completedAt !== null && !isIsoDateTime(value.completedAt)) return false;
  if (value.status === "success" && value.completedAt === null) return false;
  return true;
}

export function assertRndModule06ExecutionRecord(
  value: unknown
): asserts value is RndModule06ExecutionRecord {
  if (!isRndModule06ExecutionRecord(value)) {
    throw new Error("Invalid Module 06 execution record payload.");
  }
}

export function isRndModule06EvidenceRef(value: unknown): value is RndModule06EvidenceRef {
  if (!isObject(value)) return false;
  if (!isRndModule06EvidenceSource(value.source)) return false;
  if (!isNonEmptyString(value.refId)) return false;
  return true;
}

export function isRndModule06ConsultationResponse(
  value: unknown
): value is RndModule06ConsultationResponse {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.responseId)) return false;
  if (!isNonEmptyString(value.promptId)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isNonEmptyString(value.answer)) return false;
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length === 0) return false;
  if (!value.evidenceRefs.every((evidenceRef) => isRndModule06EvidenceRef(evidenceRef))) {
    return false;
  }
  if (!isIsoDateTime(value.respondedAt)) return false;
  return true;
}

export function assertRndModule06ConsultationResponse(
  value: unknown
): asserts value is RndModule06ConsultationResponse {
  if (!isRndModule06ConsultationResponse(value)) {
    throw new Error("Invalid Module 06 consultation response payload.");
  }
}

export function isRndModule06ActionEvaluationLog(
  value: unknown
): value is RndModule06ActionEvaluationLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.caseId)) return false;
  if (!isRndModule06NextActionType(value.expectedActionType)) return false;
  if (!isRndModule06NextActionType(value.decidedActionType)) return false;
  if (typeof value.executionSuccess !== "boolean") return false;
  if (!isIsoDateTime(value.loggedAt)) return false;
  return true;
}

export function assertRndModule06ActionEvaluationLog(
  value: unknown
): asserts value is RndModule06ActionEvaluationLog {
  if (!isRndModule06ActionEvaluationLog(value)) {
    throw new Error("Invalid Module 06 action-evaluation payload.");
  }
}

export function isRndModule06LlmEvaluationLog(
  value: unknown
): value is RndModule06LlmEvaluationLog {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.promptId)) return false;
  if (!isNonEmptyString(value.expectedAnswerKey)) return false;
  if (typeof value.responseAccepted !== "boolean") return false;
  if (!isIsoDateTime(value.judgedAt)) return false;
  return true;
}

export function assertRndModule06LlmEvaluationLog(
  value: unknown
): asserts value is RndModule06LlmEvaluationLog {
  if (!isRndModule06LlmEvaluationLog(value)) {
    throw new Error("Invalid Module 06 LLM-evaluation payload.");
  }
}

export function isRndModule06ClosedLoopOutput(
  value: unknown
): value is RndModule06ClosedLoopOutput {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.runId)) return false;
  if (value.module !== RND_MODULE_06_NAME) return false;
  if (value.schemaVersion !== RND_MODULE_06_SCHEMA_VERSION) return false;
  if (!isIsoDateTime(value.generatedAt)) return false;
  if (!Array.isArray(value.decisions) || value.decisions.length === 0) return false;
  if (!value.decisions.every((decision) => isRndModule06NextActionDecision(decision))) {
    return false;
  }
  if (!Array.isArray(value.executions) || value.executions.length === 0) return false;
  if (!value.executions.every((execution) => isRndModule06ExecutionRecord(execution))) {
    return false;
  }
  if (
    !Array.isArray(value.consultationResponses) ||
    value.consultationResponses.length === 0
  ) {
    return false;
  }
  if (
    !value.consultationResponses.every((response) =>
      isRndModule06ConsultationResponse(response)
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(value.actionEvaluationLogs) ||
    value.actionEvaluationLogs.length === 0
  ) {
    return false;
  }
  if (
    !value.actionEvaluationLogs.every((log) => isRndModule06ActionEvaluationLog(log))
  ) {
    return false;
  }
  if (!Array.isArray(value.llmEvaluationLogs) || value.llmEvaluationLogs.length === 0) {
    return false;
  }
  if (!value.llmEvaluationLogs.every((log) => isRndModule06LlmEvaluationLog(log))) {
    return false;
  }
  return true;
}

export function assertRndModule06ClosedLoopOutput(
  value: unknown
): asserts value is RndModule06ClosedLoopOutput {
  if (!isRndModule06ClosedLoopOutput(value)) {
    throw new Error("Invalid Module 06 closed-loop output payload.");
  }
}
