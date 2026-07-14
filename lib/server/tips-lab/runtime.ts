import "server-only";

import {
  explainProxyRecommendations,
  proxyModelMetadata,
  type TipsLabProfile,
} from "@/lib/server/tips-lab/model";
import interimResearchSummaryJson from "@/data/tips/interim-research-summary.json";
import { canRunTipsLabAction, isTipsLabTransitionAllowed, TIPS_LAB_STATES, type TipsLabState } from "@/lib/server/tips-lab/state";
import { checkTipsSafety } from "@/lib/tips/safety-engine";
import { listBlindTests, recomputeBlindTest, verifyBlindTests } from "@/lib/server/tips-lab/blind-tests";
import { datasetRegistry, listDatasetCases, verifyDatasetSplit } from "@/lib/server/tips-lab/dataset-evaluation";
import { decideNextAgentTask, normalizeAgentObservation, type AgentExecutionTrace, type AgentTask } from "@/lib/tips/agent-decision-engine";

export const TIPS_LAB_ACTIONS = [
  "initialize",
  "recommend",
  "retrieve_evidence",
  "create_followup",
  "ingest_pro",
  "log_adverse_event",
  "ingest_device",
  "list_blind_tests",
  "verify_blind_tests",
  "recompute_blind_test",
  "dataset_registry",
  "list_dataset_cases",
  "verify_dataset_split",
  "decide_next_action",
  "execute_agent_task",
] as const;

export type TipsLabAction = (typeof TIPS_LAB_ACTIONS)[number];

type LabInput = {
  action: TipsLabAction;
  state?: TipsLabState;
  profile?: Partial<TipsLabProfile>;
  consentScopes?: string[];
  payload?: Record<string, unknown>;
};

const DISCLOSURE =
  "AI 생성 프록시 데이터로 학습·검증한 연구용 시뮬레이션이며 실제 약사 또는 의료 판단을 대신하지 않습니다.";

const EVIDENCE = [
  {
    evidenceId: "tips-original-plan-p26",
    title: "TIPS 연구계획 기반 안전·추천 평가 계약",
    status: "APPROVED_SIMULATION_EVIDENCE",
  },
];

export const interimResearchSummary = Object.freeze(interimResearchSummaryJson);

function strings(value: unknown, limit = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}
const ALLOWED = {
  goals: ["bone_health","bowel_regular","cardiovascular_wellbeing","energy","exercise_recovery","eye_health","immune_support","maintain_muscle","maternal_wellbeing","rapid_weight_loss","sleep_quality","stress_management"],
  conditions: ["chronic_kidney_disease","chronic_liver_disease","constipation","hemochromatosis","hypercalcemia","hypertension","hypothyroidism","irritable_bowel_syndrome","osteopenia","postmenopause","recent_antibiotic_use","type_2_diabetes"],
  medications: ["ace_inhibitor","levothyroxine","metformin","statin","warfarin"],
  diets: ["low_calcium","low_fish","low_fortified_food","low_protein","low_zinc","vegan","vegetarian"],
  supplements: ["ING:MAGNESIUM","ING:VITAMIN_D"], wearable: ["low_hrv"], allergies: ["fish"],
  risks: ["fatigue_without_labs","lactating","low_appetite","muscle_discomfort","older_adult","polypharmacy","pregnant","red_flag_chest_pain","red_flag_severe_abdominal_pain","surgery_within_14_days","unsafe_high_dose_request"],
} as const;
function allowedStrings(value: unknown, allowed: readonly string[]) { const set=new Set(allowed); return strings(value).filter(item=>set.has(item)); }

function profile(value: LabInput["profile"]): TipsLabProfile {
  const age = Number(value?.age ?? 40);
  const pregnancyStatus = ["not_applicable", "not_pregnant", "pregnant", "lactating"].includes(String(value?.pregnancyStatus)) ? value?.pregnancyStatus : (value?.pregnant ? "pregnant" : "not_pregnant");
  const symptoms = Array.isArray(value?.symptoms) ? value.symptoms.filter((item): item is { code: string; severity: "mild" | "moderate" | "severe"; redFlag?: boolean } => !!item && typeof item === "object" && ["fatigue","muscle_discomfort","abdominal_pain","chest_pain"].includes(String(item.code)) && ["mild", "moderate", "severe"].includes(String(item.severity))).slice(0, 10) : [];
  const labValues: Record<string, readonly string[]> = { ferritin:["low","normal","unknown"], vitamin_d:["low","normal","unknown"], vitamin_b12:["low"], triglycerides:["high"], magnesium:["low"] };
  const labs = value?.labs && typeof value.labs === "object" ? Object.fromEntries(Object.entries(value.labs).filter(([name,status]) => typeof status === "string" && labValues[name]?.includes(status)).slice(0, 10)) : {};
  const derivedRisks = [
    ...(pregnancyStatus === "pregnant" ? ["pregnant"] : []),
    ...(pregnancyStatus === "lactating" ? ["lactating"] : []),
    ...(symptoms.some(item=>item.code === "chest_pain" || item.redFlag) ? ["red_flag_chest_pain"] : []),
    ...(symptoms.some(item=>item.code === "abdominal_pain" && item.severity === "severe") ? ["red_flag_severe_abdominal_pain"] : []),
  ];
  return {
    age: Number.isFinite(age) ? Math.min(100, Math.max(18, Math.round(age))) : 40,
    sex: value?.sex === "female" || value?.sex === "male" ? value.sex : "unknown",
    pregnant: pregnancyStatus === "pregnant",
    pregnancyStatus,
    monthlyBudgetKrw: [30000, 50000, 70000, 100000, 150000].includes(Number(value?.monthlyBudgetKrw)) ? Number(value?.monthlyBudgetKrw) : 50000,
    maxDailyPills: [2, 3, 4, 5, 6].includes(Number(value?.maxDailyPills)) ? Number(value?.maxDailyPills) : 3,
    preferredForm: value?.preferredForm === "powder" || value?.preferredForm === "tablet" ? value.preferredForm : "capsule",
    goals: allowedStrings(value?.goals, ALLOWED.goals),
    conditions: allowedStrings(value?.conditions, ALLOWED.conditions),
    medicationClasses: allowedStrings(value?.medicationClasses, ALLOWED.medications),
    allergies: allowedStrings(value?.allergies, ALLOWED.allergies),
    dietPatterns: allowedStrings(value?.dietPatterns, ALLOWED.diets),
    currentSupplements: allowedStrings(value?.currentSupplements, ALLOWED.supplements),
    wearableFeatures: allowedStrings(value?.wearableFeatures, ALLOWED.wearable),
    geneticFeatures: [],
    symptoms,
    labs,
    riskFlags: [...new Set([...allowedStrings(value?.riskFlags, ALLOWED.risks), ...derivedRisks])],
  };
}

function requireScope(scopes: string[], required: string) {
  if (!scopes.includes(required)) throw new Error(`consent_scope_required:${required}`);
}

function base(action: TipsLabAction, state: TipsLabState) {
  return {
    ok: true,
    action,
    state,
    mode: proxyModelMetadata.mode,
    model: proxyModelMetadata,
    realResearchComplete: false,
    disclosure: DISCLOSURE,
    generatedAt: new Date().toISOString(),
  };
}

const TASK_SCOPES: Partial<Record<AgentTask, string>> = {
  create_followup: "followup:write", ingest_pro: "pro:write", ingest_wearable: "device:write",
  escalate_pharmacist: "ae:write", review_adjustment: "plan:write", optimize_regimen: "plan:write",
};

function executeAgentTask(payload: Record<string, unknown>, currentState: TipsLabState): AgentExecutionTrace {
  const observation = normalizeAgentObservation(payload);
  const observedState = TIPS_LAB_STATES.includes(observation.sessionState as TipsLabState)
    ? observation.sessionState as TipsLabState
    : currentState;
  const decision = decideNextAgentTask(observation);
  const actionKey = `${decision.selectedTask}:${observedState}`;
  const block = (blockedReason: AgentExecutionTrace["blockedReason"]): AgentExecutionTrace => ({
    traceId: `trace-${Date.now().toString(36)}`, inputSnapshot: observation, decision,
    previousState: observedState, nextState: observedState, tool: decision.tool, status: "BLOCKED",
    result: {}, postconditions: [{ label: decision.expectedPostcondition, met: false }], postconditionsMet: false, blockedReason,
  });
  if (observation.previousActionKeys?.includes(actionKey)) return block("DUPLICATE_ACTION");
  if ((observation.urgentRedFlag || observation.seriousAdverseEvent) && decision.selectedTask !== "escalate_pharmacist") return block("HIGH_RISK_RECOMMENDATION_BLOCKED");
  const requiredScope = TASK_SCOPES[decision.selectedTask];
  if (requiredScope && !observation.consentScopes?.includes(requiredScope)) return block("CONSENT_REQUIRED");
  const targetState = TIPS_LAB_STATES.includes(decision.targetState as TipsLabState) ? decision.targetState as TipsLabState : currentState;
  if (!isTipsLabTransitionAllowed(observedState, targetState)) return block("INVALID_TRANSITION");
  if (observation.simulateTimeout) return {
    ...block(undefined), status: "TIMED_OUT", blockedReason: undefined, result: { statePreserved: true },
  };
  const result = { actionKey, persisted: true, queueRecorded: decision.selectedTask === "escalate_pharmacist", recommendationBlocked: targetState === "ESCALATED" };
  return {
    traceId: `trace-${Date.now().toString(36)}`, inputSnapshot: observation, decision,
    previousState: observedState, nextState: targetState, tool: decision.tool, status: "SUCCEEDED", result,
    postconditions: [{ label: decision.expectedPostcondition, met: true }], postconditionsMet: true,
  };
}

export function runTipsLab(input: LabInput) {
  if (!TIPS_LAB_ACTIONS.includes(input.action)) throw new Error("invalid_lab_action");
  const currentState = input.state ?? "NEW";
  if (!canRunTipsLabAction(currentState, input.action)) {
    throw new Error(`agent_terminal_state:${currentState}`);
  }
  const currentProfile = profile(input.profile);
  const scopes = strings(input.consentScopes, 10);

  switch (input.action) {
    case "initialize":
      return {
        ...base(input.action, currentProfile.goals.length ? "NEEDS_DATA" : "NEW"),
        profile: currentProfile,
        consentScopes: scopes,
        next: "recommend",
      };
    case "list_blind_tests":
      return {
        ...base(input.action, currentState),
        blindTest: listBlindTests(input.payload ?? {}),
      };
    case "verify_blind_tests":
      return {
        ...base(input.action, currentState),
        verification: verifyBlindTests(input.payload ?? {}),
      };
    case "recompute_blind_test":
      return { ...base(input.action, currentState), recomputation: recomputeBlindTest(input.payload ?? {}) };
    case "dataset_registry":
      return { ...base(input.action, currentState), dataset: datasetRegistry() };
    case "list_dataset_cases":
      return { ...base(input.action, currentState), datasetCases: listDatasetCases(input.payload ?? {}) };
    case "verify_dataset_split":
      return { ...base(input.action, currentState), datasetVerification: verifyDatasetSplit(input.payload ?? {}) };
    case "decide_next_action": {
      const decision = decideNextAgentTask(input.payload ?? {});
      return {
        ...base(input.action, decision.targetState as TipsLabState),
        decision,
        next: decision.selectedTask,
      };
    }
    case "execute_agent_task": {
      const trace = executeAgentTask(input.payload ?? {}, currentState);
      return { ...base(input.action, trace.nextState as TipsLabState), trace, next: trace.decision.selectedTask };
    }
    case "recommend": {
      if (!currentProfile.goals.length) throw new Error("goal_required");
      const safetyDecision = checkTipsSafety(currentProfile);
      if (safetyDecision.decision === "STOP_AND_ESCALATE") {
        return {
          ...base(input.action, "ESCALATED"),
          safety: safetyDecision,
          recommendations: [],
          inferenceSkipped: "STOP_AND_ESCALATE_BEFORE_MODEL",
          research: interimResearchSummary,
          next: "seek_urgent_care",
        };
      }
      const inference = explainProxyRecommendations(currentProfile);
      const recommendations = inference.selectedCandidates.filter(
        (item) => !safetyDecision.blockedIngredients.includes(item.ingredientId)
      ).map(({ ingredientId, label, score }) => ({ ingredientId, label, score }));
      return {
        ...base(input.action, "CANDIDATES_READY"),
        safety: safetyDecision,
        recommendations,
        inference: {
          ...inference,
          candidateScores: inference.candidateScores.map((item) => ({
            ...item,
            blockedBySafety: safetyDecision.blockedIngredients.includes(item.ingredientId),
          })),
          preSafetySelection: inference.selectedCandidates,
          postSafetySelection: recommendations,
        },
        research: interimResearchSummary,
        evidence: EVIDENCE,
        next: "retrieve_evidence",
      };
    }
    case "retrieve_evidence":
      return {
        ...base(input.action, "CANDIDATES_READY"),
        query: String(input.payload?.query ?? "").slice(0, 300),
        evidence: EVIDENCE,
        answer:
          "복용 중인 약과 질환에 따라 같은 성분도 판단이 달라집니다. 현재 결과는 연구용 근거 경로 확인이며 실제 복용 전에는 약사 또는 의료진 확인이 필요합니다.",
      };
    case "create_followup":
      requireScope(scopes, "followup:write");
      return {
        ...base(input.action, "FOLLOWUP_DUE"),
        followup: { days: 14, requestedData: ["sleep_score", "adherence"] },
      };
    case "ingest_pro":
      requireScope(scopes, "pro:write");
      return {
        ...base(input.action, "ADJUSTMENT_REVIEW"),
        pro: { accepted: true, timepointWeeks: 4, simulation: true },
      };
    case "log_adverse_event": {
      requireScope(scopes, "ae:write");
      const serious = input.payload?.serious === true;
      return {
        ...base(input.action, serious ? "ESCALATED" : "ADVERSE_EVENT"),
        adverseEvent: {
          serious,
          planStopped: serious,
          urgentReviewCreated: serious,
          simulation: true,
        },
      };
    }
    case "ingest_device":
      requireScope(scopes, "device:write");
      return {
        ...base(input.action, "ACTIVE_PLAN"),
        device: { accepted: true, source: input.payload?.source ?? "wearable", simulation: true },
      };
  }
}
