// RND: Module 06 Closed-loop AI MVP deterministic decision/execution runtime.

import {
  RND_MODULE_06_NAME,
  RND_MODULE_06_SCHEMA_VERSION,
  assertRndModule06ClosedLoopOutput,
  assertRndModule06ConsultationPrompt,
  assertRndModule06LoopInput,
  type RndModule06ConsultationPrompt,
  type RndModule06ExecutionRecord,
  type RndModule06ExecutionStatus,
  type RndModule06LoopInput,
  type RndModule06NextActionDecision,
  type RndModule06NextActionType,
  type RndModule06ConsultationResponse,
  type RndModule06ActionEvaluationLog,
  type RndModule06LlmEvaluationLog,
  type RndModule06ClosedLoopOutput,
} from "./contracts";
import {
  buildConsultationAnswer,
  buildConsultationEvidenceRefs,
  buildDecisionEvidenceIds,
  buildDecisionRationale,
  deriveDecidedAction,
  deriveExecutionStatus,
  deriveExpectedAction,
  mapActionToAnswerKey,
  mapActionToExecutionChannel,
  mapActionToExecutionDetail,
  normalizeToken,
  uniqueSorted,
} from "./mvp-engine-policy";

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

function buildRunId(generatedAt: string): string {
  const token = generatedAt.replace(/[^0-9]/g, "");
  return `${MODULE06_MVP_RUN_ID_PREFIX}-${token}`;
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
