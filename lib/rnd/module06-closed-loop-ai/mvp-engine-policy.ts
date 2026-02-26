import type {
  RndModule06ConsultationPrompt,
  RndModule06EvidenceRef,
  RndModule06ExecutionChannel,
  RndModule06ExecutionStatus,
  RndModule06LoopInput,
  RndModule06NextActionType,
} from "./contracts";

function hasInteractionEvent(
  loopInput: RndModule06LoopInput,
  eventType: RndModule06LoopInput["interactionEvents"][number]["eventType"]
): boolean {
  return loopInput.interactionEvents.some((event) => event.eventType === eventType);
}

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
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

export function deriveExpectedAction(
  loopInput: RndModule06LoopInput
): RndModule06NextActionType {
  return deriveActionPolicy(loopInput);
}

export function deriveDecidedAction(
  loopInput: RndModule06LoopInput
): RndModule06NextActionType {
  return deriveActionPolicy(loopInput);
}

export function buildDecisionRationale(
  loopInput: RndModule06LoopInput,
  actionType: RndModule06NextActionType
): string {
  void loopInput;
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

export function buildDecisionEvidenceIds(loopInput: RndModule06LoopInput): string[] {
  const evidenceIds = [
    loopInput.efficacy.evaluationId,
    loopInput.safety.safetyCaseId,
    loopInput.optimization.optimizationRunId,
    ...loopInput.safety.blockedRuleIds,
    ...loopInput.interactionEvents.map((event) => event.eventId),
  ];
  return uniqueSorted(evidenceIds);
}

export function mapActionToExecutionChannel(
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

export function mapActionToExecutionDetail(actionType: RndModule06NextActionType): string {
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

export function deriveExecutionStatus(
  _loopInput: RndModule06LoopInput,
  _actionType: RndModule06NextActionType
): RndModule06ExecutionStatus {
  return "success";
}

export function mapActionToAnswerKey(actionType: RndModule06NextActionType): string {
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

export function buildConsultationAnswer(
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

export function buildConsultationEvidenceRefs(
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
