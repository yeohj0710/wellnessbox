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

  const caseIdA = "rnd06-case-a1";
  const caseIdB = "rnd06-case-b2";

  const loopInputs: RndModule06LoopInput[] = [
    {
      caseId: caseIdA,
      module: "06_closed_loop_ai",
      schemaVersion: "2026-02-scaffold-v1",
      capturedAt: generatedAt,
      profile: {
        appUserIdHash: "sha256:0f4f95cd8d7201b3",
        ageBand: "30-39",
        sex: "female",
        healthGoals: ["sleep-quality", "stress-reduction"],
        conditions: ["fatigue"],
        medications: [],
        allergies: [],
      },
      efficacy: {
        evaluationId: "rnd04-eval-user-a1",
        deltaScore: 1.46,
        improvementPp: 20.7,
        measuredAt: generatedAt,
      },
      safety: {
        safetyCaseId: "rnd03-case-safe-a1",
        riskLevel: "low",
        prohibitedIngredientCodes: [],
        blockedRuleIds: [],
        evaluatedAt: generatedAt,
      },
      optimization: {
        optimizationRunId: "rnd05-run-a1",
        recommendedComboId: "m05-combo-omega3-magnesium",
        selectedComboId: "m05-combo-omega3-magnesium",
        selectionChanged: false,
        selectedAt: generatedAt,
      },
      interactionEvents: [
        {
          eventId: "rnd06-event-a1-consult-01",
          eventType: "consultation",
          summary: "User requested guidance on continuing current combination.",
          relatedIds: ["rnd06-prompt-a1"],
          occurredAt: generatedAt,
        },
        {
          eventId: "rnd06-event-a1-adherence-01",
          eventType: "adherence",
          summary: "Adherence remained above 90% during last 30 days.",
          relatedIds: ["rnd04-eval-user-a1"],
          occurredAt: generatedAt,
        },
      ],
      biosensorObservations: [
        {
          observationId: "rnd06-bio-a1-sleep-01",
          source: "wearable",
          metricKey: "sleep_duration_minutes",
          value: 433,
          unit: "minute",
          observedAt: generatedAt,
        },
      ],
    },
    {
      caseId: caseIdB,
      module: "06_closed_loop_ai",
      schemaVersion: "2026-02-scaffold-v1",
      capturedAt: generatedAt,
      profile: {
        appUserIdHash: "sha256:42d241bf9f7acb6a",
        ageBand: "40-49",
        sex: "male",
        healthGoals: ["metabolic-balance"],
        conditions: ["prediabetes"],
        medications: ["warfarin"],
        allergies: ["fish"],
      },
      efficacy: {
        evaluationId: "rnd04-eval-user-b2",
        deltaScore: -0.21,
        improvementPp: -2.3,
        measuredAt: generatedAt,
      },
      safety: {
        safetyCaseId: "rnd03-case-risk-b2",
        riskLevel: "high",
        prohibitedIngredientCodes: ["vitamin_k"],
        blockedRuleIds: ["m03-rule-vitk-warfarin"],
        evaluatedAt: generatedAt,
      },
      optimization: {
        optimizationRunId: "rnd05-run-b2",
        recommendedComboId: "m05-combo-omega3-probiotic",
        selectedComboId: "m05-combo-vitamin-k",
        selectionChanged: true,
        selectedAt: generatedAt,
      },
      interactionEvents: [
        {
          eventId: "rnd06-event-b2-discontinue-01",
          eventType: "discontinue",
          summary: "User reported nausea and discontinued intake.",
          relatedIds: ["m03-rule-vitk-warfarin"],
          occurredAt: generatedAt,
        },
        {
          eventId: "rnd06-event-b2-notification-01",
          eventType: "notification_response",
          summary: "User accepted follow-up consultation invitation.",
          relatedIds: ["rnd06-prompt-b2"],
          occurredAt: generatedAt,
        },
      ],
      biosensorObservations: [
        {
          observationId: "rnd06-bio-b2-cgm-01",
          source: "continuous_glucose",
          metricKey: "time_above_range_ratio",
          value: 0.37,
          unit: "ratio",
          observedAt: generatedAt,
        },
      ],
    },
  ];

  const consultationPrompts: RndModule06ConsultationPrompt[] = [
    {
      promptId: "rnd06-prompt-a1",
      caseId: caseIdA,
      question: "Current supplement plan seems to help. Should I keep it as-is?",
      contextSummary: "Improvement score increased with no active safety violations.",
      expectedAnswerKey: "maintain_plan_and_monitor",
    },
    {
      promptId: "rnd06-prompt-b2",
      caseId: caseIdB,
      question: "I feel worse and had side effects. What should I do now?",
      contextSummary: "Negative efficacy delta and high-risk safety signal from interaction rule.",
      expectedAnswerKey: "stop_and_escalate",
    },
  ];

  const decisions: RndModule06NextActionDecision[] = [
    {
      decisionId: "rnd06-decision-a1",
      caseId: caseIdA,
      actionType: "maintain",
      rationale: "Positive efficacy trend with low risk supports maintaining current combination.",
      evidenceIds: ["rnd04-eval-user-a1", "rnd03-case-safe-a1", "rnd06-event-a1-adherence-01"],
      decidedAt: generatedAt,
    },
    {
      decisionId: "rnd06-decision-b2",
      caseId: caseIdB,
      actionType: "stop",
      rationale:
        "High-risk interaction evidence and negative efficacy trend require immediate stop action.",
      evidenceIds: ["rnd04-eval-user-b2", "m03-rule-vitk-warfarin", "rnd06-event-b2-discontinue-01"],
      decidedAt: generatedAt,
    },
  ];

  const executions: RndModule06ExecutionRecord[] = [
    {
      executionId: "rnd06-exec-a1",
      decisionId: "rnd06-decision-a1",
      caseId: caseIdA,
      actionType: "maintain",
      channel: "notification",
      status: "success",
      detail: "Sent maintain-and-monitor reminder with next recheck schedule.",
      requestedAt: generatedAt,
      completedAt: generatedAt,
    },
    {
      executionId: "rnd06-exec-b2",
      decisionId: "rnd06-decision-b2",
      caseId: caseIdB,
      actionType: "stop",
      channel: "consultation",
      status: "success",
      detail: "Triggered pharmacist escalation and stop-intake advisory message.",
      requestedAt: generatedAt,
      completedAt: generatedAt,
    },
  ];

  const consultationResponses: RndModule06ConsultationResponse[] = [
    {
      responseId: "rnd06-response-a1",
      promptId: "rnd06-prompt-a1",
      caseId: caseIdA,
      answer:
        "You can continue the current plan for now and keep monitoring weekly changes in sleep and fatigue.",
      evidenceRefs: [
        { source: "efficacy_model", refId: "rnd04-eval-user-a1" },
        { source: "safety_engine", refId: "rnd03-case-safe-a1" },
      ],
      respondedAt: generatedAt,
    },
    {
      responseId: "rnd06-response-b2",
      promptId: "rnd06-prompt-b2",
      caseId: caseIdB,
      answer:
        "Stop the current intake immediately and proceed with pharmacist consultation due to interaction risk.",
      evidenceRefs: [
        { source: "safety_engine", refId: "m03-rule-vitk-warfarin" },
        { source: "consultation_log", refId: "rnd06-event-b2-discontinue-01" },
      ],
      respondedAt: generatedAt,
    },
  ];

  const actionEvaluationLogs: RndModule06ActionEvaluationLog[] = [
    {
      caseId: caseIdA,
      expectedActionType: "maintain",
      decidedActionType: "maintain",
      executionSuccess: true,
      loggedAt: generatedAt,
    },
    {
      caseId: caseIdB,
      expectedActionType: "stop",
      decidedActionType: "stop",
      executionSuccess: true,
      loggedAt: generatedAt,
    },
  ];

  const llmEvaluationLogs: RndModule06LlmEvaluationLog[] = [
    {
      promptId: "rnd06-prompt-a1",
      expectedAnswerKey: "maintain_plan_and_monitor",
      responseAccepted: true,
      judgedAt: generatedAt,
    },
    {
      promptId: "rnd06-prompt-b2",
      expectedAnswerKey: "stop_and_escalate",
      responseAccepted: true,
      judgedAt: generatedAt,
    },
  ];

  const output: RndModule06ClosedLoopOutput = {
    runId: "rnd06-run-2026-02-scaffold-001",
    module: "06_closed_loop_ai",
    schemaVersion: "2026-02-scaffold-v1",
    generatedAt,
    decisions,
    executions,
    consultationResponses,
    actionEvaluationLogs,
    llmEvaluationLogs,
  };

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

