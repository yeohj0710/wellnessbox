import "server-only";

import {
  explainProxyRecommendations,
  proxyModelMetadata,
  type TipsLabProfile,
} from "@/lib/server/tips-lab/model";
import interimResearchSummaryJson from "@/data/tips/interim-research-summary.json";
import { canRunTipsLabAction, type TipsLabState } from "@/lib/server/tips-lab/state";
import { checkTipsSafety } from "@/lib/tips/safety-engine";

export const TIPS_LAB_ACTIONS = [
  "initialize",
  "recommend",
  "retrieve_evidence",
  "create_followup",
  "ingest_pro",
  "log_adverse_event",
  "ingest_device",
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

function profile(value: LabInput["profile"]): TipsLabProfile {
  const age = Number(value?.age ?? 40);
  return {
    age: Number.isFinite(age) ? Math.min(100, Math.max(18, Math.round(age))) : 40,
    sex: value?.sex === "female" || value?.sex === "male" ? value.sex : "unknown",
    pregnant: value?.pregnant === true,
    goals: strings(value?.goals, 5),
    conditions: strings(value?.conditions, 10),
    medicationClasses: strings(value?.medicationClasses, 10),
    allergies: strings(value?.allergies, 10),
    currentSupplements: strings(value?.currentSupplements, 10),
    riskFlags: strings(value?.riskFlags, 10),
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
