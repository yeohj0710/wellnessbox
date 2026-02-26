import type {
  RndModule06ActionEvaluationLog,
  RndModule06ClosedLoopOutput,
  RndModule06ConsultationPrompt,
  RndModule06ConsultationResponse,
  RndModule06ExecutionRecord,
  RndModule06LlmEvaluationLog,
  RndModule06LoopInput,
  RndModule06NextActionDecision,
} from "./contracts";

export type Module06FixtureRecords = {
  loopInputs: RndModule06LoopInput[];
  consultationPrompts: RndModule06ConsultationPrompt[];
  output: RndModule06ClosedLoopOutput;
};

export function buildModule06FixtureRecords(
  generatedAt: string
): Module06FixtureRecords {
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

  return {
    loopInputs,
    consultationPrompts,
    output,
  };
}
