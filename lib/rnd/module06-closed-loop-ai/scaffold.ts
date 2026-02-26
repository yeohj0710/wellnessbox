// RND: Module 06 Closed-loop AI scaffold fixture builder.

import {
  assertRndModule06ActionEvaluationLog,
  assertRndModule06ClosedLoopOutput,
  assertRndModule06ConsultationPrompt,
  assertRndModule06ConsultationResponse,
  assertRndModule06ExecutionRecord,
  assertRndModule06LlmEvaluationLog,
  assertRndModule06LoopInput,
  assertRndModule06NextActionDecision,
  type RndModule06ActionEvaluationLog,
  type RndModule06ClosedLoopOutput,
  type RndModule06ConsultationPrompt,
  type RndModule06ConsultationResponse,
  type RndModule06ExecutionRecord,
  type RndModule06LlmEvaluationLog,
  type RndModule06LoopInput,
  type RndModule06NextActionDecision,
} from "./contracts";
import { buildModule06FixtureRecords } from "./scaffold-fixtures";

export type Module06ScaffoldBundle = {
  generatedAt: string;
  loopInputs: RndModule06LoopInput[];
  consultationPrompts: RndModule06ConsultationPrompt[];
  output: RndModule06ClosedLoopOutput;
};

function assertIsoDateTime(value: string, fieldName: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO datetime string.`);
  }
}

export function buildModule06ScaffoldBundle(
  generatedAt = new Date().toISOString()
): Module06ScaffoldBundle {
  assertIsoDateTime(generatedAt, "generatedAt");

  const { loopInputs, consultationPrompts, output } =
    buildModule06FixtureRecords(generatedAt);

  const bundle: Module06ScaffoldBundle = {
    generatedAt,
    loopInputs,
    consultationPrompts,
    output,
  };
  assertModule06ScaffoldBundle(bundle);
  return bundle;
}

export function assertModule06ScaffoldBundle(bundle: Module06ScaffoldBundle): void {
  assertIsoDateTime(bundle.generatedAt, "generatedAt");

  if (bundle.loopInputs.length === 0) {
    throw new Error("At least one Module 06 loop input is required.");
  }
  bundle.loopInputs.forEach((loopInput) => assertRndModule06LoopInput(loopInput));

  if (bundle.consultationPrompts.length === 0) {
    throw new Error("At least one Module 06 consultation prompt is required.");
  }
  bundle.consultationPrompts.forEach((prompt) => assertRndModule06ConsultationPrompt(prompt));

  assertRndModule06ClosedLoopOutput(bundle.output);
  if (bundle.output.generatedAt !== bundle.generatedAt) {
    throw new Error("Module 06 bundle generatedAt must match output generatedAt.");
  }

  const inputCaseIds = new Set(bundle.loopInputs.map((loopInput) => loopInput.caseId));
  if (inputCaseIds.size !== bundle.loopInputs.length) {
    throw new Error("Module 06 loop inputs must be unique by caseId.");
  }

  const promptById = new Map<string, RndModule06ConsultationPrompt>();
  bundle.consultationPrompts.forEach((prompt) => {
    if (promptById.has(prompt.promptId)) {
      throw new Error(`Duplicate Module 06 promptId detected: ${prompt.promptId}.`);
    }
    if (!inputCaseIds.has(prompt.caseId)) {
      throw new Error(`Prompt ${prompt.promptId} references unknown caseId ${prompt.caseId}.`);
    }
    promptById.set(prompt.promptId, prompt);
  });

  const decisionById = new Map<string, RndModule06NextActionDecision>();
  bundle.output.decisions.forEach((decision) => {
    assertRndModule06NextActionDecision(decision);
    if (decisionById.has(decision.decisionId)) {
      throw new Error(`Duplicate Module 06 decisionId detected: ${decision.decisionId}.`);
    }
    if (!inputCaseIds.has(decision.caseId)) {
      throw new Error(
        `Decision ${decision.decisionId} references unknown caseId ${decision.caseId}.`
      );
    }
    decisionById.set(decision.decisionId, decision);
  });

  const decisionCaseIds = new Set(
    bundle.output.decisions.map((decision) => decision.caseId)
  );
  if (decisionCaseIds.size !== bundle.output.decisions.length) {
    throw new Error("Module 06 scaffold expects one decision per case.");
  }

  bundle.output.executions.forEach((execution) => {
    assertRndModule06ExecutionRecord(execution);
    const decision = decisionById.get(execution.decisionId);
    if (!decision) {
      throw new Error(
        `Execution ${execution.executionId} references unknown decisionId ${execution.decisionId}.`
      );
    }
    if (execution.caseId !== decision.caseId) {
      throw new Error(`Execution ${execution.executionId} caseId mismatch with decision.`);
    }
    if (execution.actionType !== decision.actionType) {
      throw new Error(`Execution ${execution.executionId} actionType mismatch with decision.`);
    }
  });

  const successfulExecutionCaseIds = new Set(
    bundle.output.executions
      .filter((execution) => execution.status === "success")
      .map((execution) => execution.caseId)
  );

  const actionEvalCaseIds = new Set<string>();
  bundle.output.actionEvaluationLogs.forEach((actionLog) => {
    assertRndModule06ActionEvaluationLog(actionLog);
    if (!inputCaseIds.has(actionLog.caseId)) {
      throw new Error(`Action evaluation references unknown caseId ${actionLog.caseId}.`);
    }
    if (actionEvalCaseIds.has(actionLog.caseId)) {
      throw new Error(
        `Duplicate action evaluation log for caseId ${actionLog.caseId} detected.`
      );
    }
    actionEvalCaseIds.add(actionLog.caseId);

    const matchingDecision = [...decisionById.values()].find(
      (decision) => decision.caseId === actionLog.caseId
    );
    if (!matchingDecision) {
      throw new Error(`Missing decision for action evaluation caseId ${actionLog.caseId}.`);
    }
    if (matchingDecision.actionType !== actionLog.decidedActionType) {
      throw new Error(
        `Action evaluation decidedActionType mismatch for caseId ${actionLog.caseId}.`
      );
    }
    const expectedExecutionSuccess = successfulExecutionCaseIds.has(actionLog.caseId);
    if (expectedExecutionSuccess !== actionLog.executionSuccess) {
      throw new Error(
        `Action evaluation executionSuccess mismatch for caseId ${actionLog.caseId}.`
      );
    }
  });
  if (actionEvalCaseIds.size !== decisionCaseIds.size) {
    throw new Error("Module 06 requires one action evaluation log per decision.");
  }

  const responsePromptIds = new Set<string>();
  bundle.output.consultationResponses.forEach((response) => {
    assertRndModule06ConsultationResponse(response);
    const prompt = promptById.get(response.promptId);
    if (!prompt) {
      throw new Error(
        `Consultation response ${response.responseId} references unknown promptId ${response.promptId}.`
      );
    }
    if (response.caseId !== prompt.caseId) {
      throw new Error(`Consultation response ${response.responseId} caseId mismatch.`);
    }
    if (responsePromptIds.has(response.promptId)) {
      throw new Error(
        `Duplicate consultation response for promptId ${response.promptId} detected.`
      );
    }
    responsePromptIds.add(response.promptId);
  });

  const llmPromptIds = new Set<string>();
  bundle.output.llmEvaluationLogs.forEach((llmLog) => {
    assertRndModule06LlmEvaluationLog(llmLog);
    const prompt = promptById.get(llmLog.promptId);
    if (!prompt) {
      throw new Error(`LLM evaluation references unknown promptId ${llmLog.promptId}.`);
    }
    if (llmLog.expectedAnswerKey !== prompt.expectedAnswerKey) {
      throw new Error(`LLM expectedAnswerKey mismatch for promptId ${llmLog.promptId}.`);
    }
    if (llmPromptIds.has(llmLog.promptId)) {
      throw new Error(`Duplicate LLM evaluation log for promptId ${llmLog.promptId}.`);
    }
    llmPromptIds.add(llmLog.promptId);
  });

  if (responsePromptIds.size !== llmPromptIds.size) {
    throw new Error("Module 06 requires one LLM evaluation log per consultation response.");
  }
  responsePromptIds.forEach((promptId) => {
    if (!llmPromptIds.has(promptId)) {
      throw new Error(`Missing LLM evaluation log for promptId ${promptId}.`);
    }
  });
}
