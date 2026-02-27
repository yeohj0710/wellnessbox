import {
  RND_MODULE_06_NAME,
  RND_MODULE_06_SCHEMA_VERSION,
  type RndModule06ActionEvaluationLog,
  type RndModule06ClosedLoopOutput,
  type RndModule06ConsultationPrompt,
  type RndModule06ConsultationResponse,
  type RndModule06EvidenceRef,
  type RndModule06ExecutionRecord,
  type RndModule06LlmEvaluationLog,
  type RndModule06NextActionDecision,
} from "./contracts-types";
import {
  isIsoDateTime,
  isNonEmptyString,
  isObject,
  isRndModule06EvidenceSource,
  isRndModule06ExecutionChannel,
  isRndModule06ExecutionStatus,
  isRndModule06NextActionType,
  isStringArray,
} from "./contracts-validators-primitives";

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
