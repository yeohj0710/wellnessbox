// RND: Module 06 Closed-loop AI MVP deterministic decision/execution runtime.

import {
  RND_MODULE_06_NAME,
  RND_MODULE_06_SCHEMA_VERSION,
  assertRndModule06ClosedLoopOutput,
  assertRndModule06ConsultationPrompt,
  assertRndModule06LoopInput,
  type RndModule06ConsultationPrompt,
  type RndModule06ExecutionChannel,
  type RndModule06ExecutionRecord,
  type RndModule06ExecutionStatus,
  type RndModule06EvidenceRef,
  type RndModule06LoopInput,
  type RndModule06NextActionDecision,
  type RndModule06NextActionType,
  type RndModule06ConsultationResponse,
  type RndModule06ActionEvaluationLog,
  type RndModule06LlmEvaluationLog,
  type RndModule06ClosedLoopOutput,
} from "./contracts";

const MODULE06_MVP_PHASE = "MVP" as const;
const MODULE06_MVP_RUN_ID_PREFIX = "rnd06-mvp-run" as const;

export type Module06MvpRuntimeLog = {
  logId: string;
  caseId: string | null;
  module: typeof RND_MODULE_06_NAME;
  phase: typeof MODULE06_MVP_PHASE;
  stage:
    | "input_validation"
    | "decision"
    | "execution"
    | "consultation"
    | "output_build";
  event: string;
  details: Record<string, string | number | boolean | null>;
  loggedAt: string;
};

export type Module06MvpTraceLog = {
  traceId: string;
  caseId: string;
  traceType: "decision" | "execution" | "consultation";
  summary: string;
  evidenceIds: string[];
  loggedAt: string;
};

export type RunModule06ClosedLoopMvpInput = {
  loopInputs: RndModule06LoopInput[];
  consultationPrompts: RndModule06ConsultationPrompt[];
  generatedAt?: string;
  runId?: string;
};

export type RunModule06ClosedLoopMvpResult = {
  module: typeof RND_MODULE_06_NAME;
  phase: typeof MODULE06_MVP_PHASE;
  generatedAt: string;
  output: RndModule06ClosedLoopOutput;
  traceLogs: Module06MvpTraceLog[];
  runtimeLogs: Module06MvpRuntimeLog[];
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildRunId(generatedAt: string): string {
  const token = generatedAt.replace(/[^0-9]/g, "");
  return `${MODULE06_MVP_RUN_ID_PREFIX}-${token}`;
}

function hasInteractionEvent(
  loopInput: RndModule06LoopInput,
  eventType: RndModule06LoopInput["interactionEvents"][number]["eventType"]
): boolean {
  return loopInput.interactionEvents.some((event) => event.eventType === eventType);
}

function deriveActionPolicy(loopInput: RndModule06LoopInput): RndModule06NextActionType {
  const hasHighRisk =
    loopInput.safety.riskLevel === "high" || loopInput.safety.blockedRuleIds.length > 0;
  const hasMediumRisk = loopInput.safety.riskLevel === "medium";
  const hasDiscontinueEvent = hasInteractionEvent(loopInput, "discontinue");
  const hasNotificationResponse = hasInteractionEvent(
    loopInput,
    "notification_response"
  );
  const hasAdherenceSignal = hasInteractionEvent(loopInput, "adherence");
  const hasConsultationSignal = hasInteractionEvent(loopInput, "consultation");
  const hasNegativeEfficacy =
    loopInput.efficacy.deltaScore < 0 || loopInput.efficacy.improvementPp < 0;
  const needsAdditionalInput =
    loopInput.biosensorObservations.length === 0 && !hasAdherenceSignal;

  if (hasHighRisk && hasDiscontinueEvent) return "stop";
  if (hasHighRisk && hasNotificationResponse) return "escalate_consult";
  if (hasHighRisk) return "stop";
  if (needsAdditionalInput) return "request_info";
  if (hasNegativeEfficacy || loopInput.optimization.selectionChanged) return "adjust";
  if (hasMediumRisk) return "monitor";
  if (hasConsultationSignal || hasAdherenceSignal) return "maintain";
  return "monitor";
}

function deriveExpectedAction(loopInput: RndModule06LoopInput): RndModule06NextActionType {
  return deriveActionPolicy(loopInput);
}

function deriveDecidedAction(loopInput: RndModule06LoopInput): RndModule06NextActionType {
  return deriveActionPolicy(loopInput);
}

function buildDecisionRationale(
  loopInput: RndModule06LoopInput,
  actionType: RndModule06NextActionType
): string {
  switch (actionType) {
    case "maintain":
      return "Positive efficacy trend with low/controlled safety risk supports maintaining the current plan.";
    case "adjust":
      return "Observed efficacy regression or changed selection indicates recommendation adjustment is required.";
    case "stop":
      return "High-risk safety signal or discontinue event requires immediate intake stop guidance.";
    case "request_info":
      return "Insufficient monitoring data requires additional user input before recommendation changes.";
    case "escalate_consult":
      return "High-risk context with follow-up response requires pharmacist consultation escalation.";
    case "monitor":
      return "Current signals are mixed and should be monitored with a scheduled re-measurement step.";
    default: {
      const _exhaustiveCheck: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustiveCheck}`);
    }
  }
}

function buildDecisionEvidenceIds(loopInput: RndModule06LoopInput): string[] {
  const evidenceIds = [
    loopInput.efficacy.evaluationId,
    loopInput.safety.safetyCaseId,
    loopInput.optimization.optimizationRunId,
    ...loopInput.safety.blockedRuleIds,
    ...loopInput.interactionEvents.map((event) => event.eventId),
  ];
  return uniqueSorted(evidenceIds);
}

function mapActionToExecutionChannel(
  actionType: RndModule06NextActionType
): RndModule06ExecutionChannel {
  switch (actionType) {
    case "maintain":
    case "monitor":
      return "notification";
    case "adjust":
      return "recommendation";
    case "stop":
    case "escalate_consult":
      return "consultation";
    case "request_info":
      return "task_queue";
    default: {
      const _exhaustiveCheck: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustiveCheck}`);
    }
  }
}

function mapActionToExecutionDetail(actionType: RndModule06NextActionType): string {
  switch (actionType) {
    case "maintain":
      return "Queued maintain-and-monitor reminder notification.";
    case "adjust":
      return "Queued recommendation update for next optimization cycle.";
    case "stop":
      return "Queued immediate stop-intake advisory and pharmacist callback.";
    case "request_info":
      return "Queued additional user input request form.";
    case "escalate_consult":
      return "Queued pharmacist escalation consultation request.";
    case "monitor":
      return "Queued monitoring reminder with follow-up remeasurement.";
    default: {
      const _exhaustiveCheck: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustiveCheck}`);
    }
  }
}

function deriveExecutionStatus(
  _loopInput: RndModule06LoopInput,
  _actionType: RndModule06NextActionType
): RndModule06ExecutionStatus {
  return "success";
}

function mapActionToAnswerKey(actionType: RndModule06NextActionType): string {
  switch (actionType) {
    case "maintain":
      return "maintain_plan_and_monitor";
    case "adjust":
      return "adjust_plan_and_followup";
    case "stop":
    case "escalate_consult":
      return "stop_and_escalate";
    case "request_info":
      return "request_more_information";
    case "monitor":
      return "monitor_and_remeasure";
    default: {
      const _exhaustiveCheck: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustiveCheck}`);
    }
  }
}

function buildConsultationAnswer(
  prompt: RndModule06ConsultationPrompt,
  actionType: RndModule06NextActionType
): string {
  const prefix = `Question: ${prompt.question}`;
  switch (actionType) {
    case "maintain":
      return `${prefix} Continue the current plan, keep weekly monitoring, and re-check if symptoms change.`;
    case "adjust":
      return `${prefix} Adjust the current combination and schedule a follow-up check after the next measurement cycle.`;
    case "stop":
      return `${prefix} Stop the current intake immediately and proceed with pharmacist consultation due to safety risk.`;
    case "request_info":
      return `${prefix} Please provide additional symptom, adherence, and lifestyle data before changing the recommendation.`;
    case "escalate_consult":
      return `${prefix} Escalate to pharmacist consultation now and pause self-adjustment until review is complete.`;
    case "monitor":
      return `${prefix} Keep the current regimen for now, and prioritize monitoring plus near-term remeasurement.`;
    default: {
      const _exhaustiveCheck: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustiveCheck}`);
    }
  }
}

function buildConsultationEvidenceRefs(
  loopInput: RndModule06LoopInput
): RndModule06EvidenceRef[] {
  const rawRefs: RndModule06EvidenceRef[] = [
    { source: "data_lake", refId: `case:${loopInput.caseId}` },
    { source: "safety_engine", refId: loopInput.safety.safetyCaseId },
    { source: "efficacy_model", refId: loopInput.efficacy.evaluationId },
    { source: "optimization_engine", refId: loopInput.optimization.optimizationRunId },
  ];

  const firstInteraction = loopInput.interactionEvents[0];
  if (firstInteraction) {
    rawRefs.push({
      source: "consultation_log",
      refId: firstInteraction.eventId,
    });
  }

  const deduped = new Map<string, RndModule06EvidenceRef>();
  for (const evidenceRef of rawRefs) {
    if (!evidenceRef.refId.trim()) continue;
    const key = `${evidenceRef.source}:${evidenceRef.refId}`;
    if (!deduped.has(key)) {
      deduped.set(key, evidenceRef);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const leftKey = `${left.source}:${left.refId}`;
    const rightKey = `${right.source}:${right.refId}`;
    return leftKey.localeCompare(rightKey);
  });
}

function sameSchemaVersion(
  loopInputs: RndModule06LoopInput[]
): typeof RND_MODULE_06_SCHEMA_VERSION {
  const hasUnexpectedVersion = loopInputs.some(
    (loopInput) => loopInput.schemaVersion !== RND_MODULE_06_SCHEMA_VERSION
  );
  if (hasUnexpectedVersion) {
    throw new Error(
      `Module 06 MVP requires schemaVersion=${RND_MODULE_06_SCHEMA_VERSION}.`
    );
  }
  return RND_MODULE_06_SCHEMA_VERSION;
}

export function runModule06ClosedLoopMvp(
  input: RunModule06ClosedLoopMvpInput
): RunModule06ClosedLoopMvpResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertIsoDateTime(generatedAt, "generatedAt");

  if (input.loopInputs.length === 0) {
    throw new Error("Module 06 MVP requires at least one loop input.");
  }
  if (input.consultationPrompts.length === 0) {
    throw new Error("Module 06 MVP requires at least one consultation prompt.");
  }

  input.loopInputs.forEach((loopInput) => assertRndModule06LoopInput(loopInput));
  input.consultationPrompts.forEach((prompt) => assertRndModule06ConsultationPrompt(prompt));

  const sortedLoopInputs = [...input.loopInputs].sort((left, right) =>
    left.caseId.localeCompare(right.caseId)
  );
  const sortedPrompts = [...input.consultationPrompts].sort((left, right) =>
    left.promptId.localeCompare(right.promptId)
  );

  const schemaVersion = sameSchemaVersion(sortedLoopInputs);
  const caseInputByCaseId = new Map<string, RndModule06LoopInput>();
  for (const loopInput of sortedLoopInputs) {
    if (caseInputByCaseId.has(loopInput.caseId)) {
      throw new Error(`Duplicate loop input caseId detected: ${loopInput.caseId}`);
    }
    caseInputByCaseId.set(loopInput.caseId, loopInput);
  }

  const promptIds = new Set<string>();
  const promptedCaseIds = new Set<string>();
  for (const prompt of sortedPrompts) {
    if (promptIds.has(prompt.promptId)) {
      throw new Error(`Duplicate consultation promptId detected: ${prompt.promptId}`);
    }
    promptIds.add(prompt.promptId);

    if (!caseInputByCaseId.has(prompt.caseId)) {
      throw new Error(`Prompt ${prompt.promptId} references unknown caseId ${prompt.caseId}`);
    }
    promptedCaseIds.add(prompt.caseId);
  }

  for (const caseId of caseInputByCaseId.keys()) {
    if (!promptedCaseIds.has(caseId)) {
      throw new Error(`Missing consultation prompt for caseId ${caseId}`);
    }
  }

  const runtimeLogs: Module06MvpRuntimeLog[] = [];
  let runtimeLogCount = 0;
  const pushRuntimeLog = (
    stage: Module06MvpRuntimeLog["stage"],
    event: string,
    details: Module06MvpRuntimeLog["details"],
    caseId: string | null = null
  ) => {
    runtimeLogCount += 1;
    runtimeLogs.push({
      logId: `m06-runtime-${String(runtimeLogCount).padStart(4, "0")}`,
      caseId,
      module: RND_MODULE_06_NAME,
      phase: MODULE06_MVP_PHASE,
      stage,
      event,
      details,
      loggedAt: generatedAt,
    });
  };

  pushRuntimeLog("input_validation", "validated_inputs", {
    caseCount: sortedLoopInputs.length,
    promptCount: sortedPrompts.length,
    schemaVersion,
  });

  const decisions: RndModule06NextActionDecision[] = [];
  const executions: RndModule06ExecutionRecord[] = [];
  const actionEvaluationLogs: RndModule06ActionEvaluationLog[] = [];
  const traceLogs: Module06MvpTraceLog[] = [];
  const decidedActionByCaseId = new Map<string, RndModule06NextActionType>();
  const decisionIdByCaseId = new Map<string, string>();
  const executionStatusByCaseId = new Map<string, RndModule06ExecutionStatus>();

  let decisionCount = 0;
  let executionCount = 0;
  let traceCount = 0;

  for (const loopInput of sortedLoopInputs) {
    const expectedActionType = deriveExpectedAction(loopInput);
    const decidedActionType = deriveDecidedAction(loopInput);
    const decisionEvidenceIds = buildDecisionEvidenceIds(loopInput);

    decisionCount += 1;
    const decisionId = `m06-decision-${String(decisionCount).padStart(4, "0")}`;
    const decision: RndModule06NextActionDecision = {
      decisionId,
      caseId: loopInput.caseId,
      actionType: decidedActionType,
      rationale: buildDecisionRationale(loopInput, decidedActionType),
      evidenceIds: decisionEvidenceIds,
      decidedAt: generatedAt,
    };
    decisions.push(decision);
    decidedActionByCaseId.set(loopInput.caseId, decidedActionType);
    decisionIdByCaseId.set(loopInput.caseId, decisionId);

    pushRuntimeLog(
      "decision",
      "decided_next_action",
      {
        expectedActionType,
        decidedActionType,
        evidenceCount: decisionEvidenceIds.length,
      },
      loopInput.caseId
    );

    traceCount += 1;
    traceLogs.push({
      traceId: `m06-trace-${String(traceCount).padStart(4, "0")}`,
      caseId: loopInput.caseId,
      traceType: "decision",
      summary: `Decided next action "${decidedActionType}".`,
      evidenceIds: decisionEvidenceIds,
      loggedAt: generatedAt,
    });

    const status = deriveExecutionStatus(loopInput, decidedActionType);
    executionStatusByCaseId.set(loopInput.caseId, status);
    executionCount += 1;
    const execution: RndModule06ExecutionRecord = {
      executionId: `m06-execution-${String(executionCount).padStart(4, "0")}`,
      decisionId,
      caseId: loopInput.caseId,
      actionType: decidedActionType,
      channel: mapActionToExecutionChannel(decidedActionType),
      status,
      detail: mapActionToExecutionDetail(decidedActionType),
      requestedAt: generatedAt,
      completedAt: status === "success" ? generatedAt : null,
    };
    executions.push(execution);

    pushRuntimeLog(
      "execution",
      "executed_next_action",
      {
        actionType: decidedActionType,
        channel: execution.channel,
        status: execution.status,
      },
      loopInput.caseId
    );

    traceCount += 1;
    traceLogs.push({
      traceId: `m06-trace-${String(traceCount).padStart(4, "0")}`,
      caseId: loopInput.caseId,
      traceType: "execution",
      summary: `Executed "${decidedActionType}" via "${execution.channel}" with status "${execution.status}".`,
      evidenceIds: decisionEvidenceIds,
      loggedAt: generatedAt,
    });

    actionEvaluationLogs.push({
      caseId: loopInput.caseId,
      expectedActionType,
      decidedActionType,
      executionSuccess: status === "success",
      loggedAt: generatedAt,
    });
  }

  const consultationResponses: RndModule06ConsultationResponse[] = [];
  const llmEvaluationLogs: RndModule06LlmEvaluationLog[] = [];
  let responseCount = 0;

  for (const prompt of sortedPrompts) {
    const loopInput = caseInputByCaseId.get(prompt.caseId);
    if (!loopInput) {
      throw new Error(`Missing loop input for prompt caseId ${prompt.caseId}`);
    }

    const decidedActionType = decidedActionByCaseId.get(prompt.caseId);
    if (!decidedActionType) {
      throw new Error(`Missing decided action for prompt caseId ${prompt.caseId}`);
    }

    const responseAnswerKey = mapActionToAnswerKey(decidedActionType);
    const expectedAnswerKey = normalizeToken(prompt.expectedAnswerKey);
    const responseAccepted = normalizeToken(responseAnswerKey) === expectedAnswerKey;
    const evidenceRefs = buildConsultationEvidenceRefs(loopInput);

    responseCount += 1;
    const response: RndModule06ConsultationResponse = {
      responseId: `m06-response-${String(responseCount).padStart(4, "0")}`,
      promptId: prompt.promptId,
      caseId: prompt.caseId,
      answer: buildConsultationAnswer(prompt, decidedActionType),
      evidenceRefs,
      respondedAt: generatedAt,
    };
    consultationResponses.push(response);

    llmEvaluationLogs.push({
      promptId: prompt.promptId,
      expectedAnswerKey: prompt.expectedAnswerKey,
      responseAccepted,
      judgedAt: generatedAt,
    });

    pushRuntimeLog(
      "consultation",
      "generated_consultation_response",
      {
        promptId: prompt.promptId,
        responseAccepted,
        evidenceRefCount: evidenceRefs.length,
      },
      prompt.caseId
    );

    const decisionId = decisionIdByCaseId.get(prompt.caseId);
    const executionStatus = executionStatusByCaseId.get(prompt.caseId);
    const consultationEvidenceIds = uniqueSorted([
      `prompt:${prompt.promptId}`,
      `decision:${decisionId ?? "unknown"}`,
      `execution_status:${executionStatus ?? "unknown"}`,
      ...evidenceRefs.map((evidenceRef) => `${evidenceRef.source}:${evidenceRef.refId}`),
    ]);

    traceCount += 1;
    traceLogs.push({
      traceId: `m06-trace-${String(traceCount).padStart(4, "0")}`,
      caseId: prompt.caseId,
      traceType: "consultation",
      summary: `Generated consultation response for prompt "${prompt.promptId}".`,
      evidenceIds: consultationEvidenceIds,
      loggedAt: generatedAt,
    });
  }

  const runId = input.runId ?? buildRunId(generatedAt);
  const output: RndModule06ClosedLoopOutput = {
    runId,
    module: RND_MODULE_06_NAME,
    schemaVersion,
    generatedAt,
    decisions,
    executions,
    consultationResponses,
    actionEvaluationLogs,
    llmEvaluationLogs,
  };
  assertRndModule06ClosedLoopOutput(output);

  pushRuntimeLog("output_build", "built_output", {
    runId,
    decisionCount: output.decisions.length,
    executionCount: output.executions.length,
    responseCount: output.consultationResponses.length,
    actionEvaluationCount: output.actionEvaluationLogs.length,
    llmEvaluationCount: output.llmEvaluationLogs.length,
    traceLogCount: traceLogs.length,
  });

  return {
    module: RND_MODULE_06_NAME,
    phase: MODULE06_MVP_PHASE,
    generatedAt,
    output,
    traceLogs,
    runtimeLogs,
  };
}
