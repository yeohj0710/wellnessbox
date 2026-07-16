import "server-only";

type JsonRecord = Record<string, unknown>;

const SAFETY_ACTION_RANK = {
  PASS: 0,
  WARN: 1,
  BLOCK: 2,
  STOP_AND_ESCALATE: 3,
} as const;

type SafetyAction = keyof typeof SAFETY_ACTION_RANK;

export type WbRndInterimSafetyAuthority = {
  final: true;
  mode: "rnd_final" | "service_fail_closed";
  reason: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafetyAction(value: unknown): value is SafetyAction {
  return typeof value === "string" && Object.hasOwn(SAFETY_ACTION_RANK, value);
}

function isValidFinding(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.rule_id === "string" &&
    value.rule_id.length > 0 &&
    typeof value.category === "string" &&
    value.category.length > 0 &&
    isSafetyAction(value.action) &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    Array.isArray(value.reference_ids) &&
    value.reference_ids.every((item) => typeof item === "string") &&
    Array.isArray(value.claim_ids) &&
    value.claim_ids.every((item) => typeof item === "string")
  );
}

function isValidRecommendation(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.ingredient === "string" &&
    value.ingredient.length > 0 &&
    Number.isInteger(value.rank) &&
    Number(value.rank) > 0 &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    Array.isArray(value.evidence_ids) &&
    value.evidence_ids.every((item) => typeof item === "string")
  );
}

function validateWbRndInterimRecommendation(value: unknown): value is JsonRecord {
  if (!isRecord(value)) return false;
  if (
    typeof value.run_id !== "string" ||
    !value.run_id.startsWith("rec_") ||
    !["READY", "BLOCKED"].includes(String(value.status)) ||
    value.mode !== "PROXY_GOLD_SIMULATION" ||
    value.simulation !== true ||
    !(
      (typeof value.model_id === "string" && value.model_id.length > 0) ||
      (value.status === "BLOCKED" && value.model_id === null)
    ) ||
    !isSafetyAction(value.safety_action) ||
    !Array.isArray(value.findings) ||
    !value.findings.every(isValidFinding) ||
    !Array.isArray(value.recommendations) ||
    !value.recommendations.every(isValidRecommendation) ||
    typeof value.uncertainty !== "string"
  ) {
    return false;
  }

  const strongestFinding = value.findings.reduce<SafetyAction>(
    (strongest, finding) => {
      const action = (finding as JsonRecord).action as SafetyAction;
      return SAFETY_ACTION_RANK[action] > SAFETY_ACTION_RANK[strongest]
        ? action
        : strongest;
    },
    "PASS"
  );
  if (strongestFinding !== value.safety_action) return false;

  const shouldBlock = ["BLOCK", "STOP_AND_ESCALATE"].includes(
    value.safety_action
  );
  if ((value.status === "BLOCKED") !== shouldBlock) return false;
  if (shouldBlock && value.recommendations.length > 0) return false;
  return true;
}

export function buildWbRndInterimFailClosedResponse(reason: string) {
  const safetyAuthority: WbRndInterimSafetyAuthority = {
    final: true,
    mode: "service_fail_closed",
    reason,
  };
  return {
    run_id: null,
    status: "BLOCKED",
    mode: "SERVICE_FAIL_CLOSED",
    simulation: true,
    model_id: null,
    safety_action: "BLOCK",
    findings: [
      {
        rule_id: "SERVICE-RND-FINAL-AUTHORITY-001",
        category: "service_boundary",
        action: "BLOCK",
        reason,
        reference_ids: [],
        claim_ids: [],
      },
    ],
    recommendations: [],
    uncertainty:
      "R&D 안전 엔진의 최종 판정을 확인하지 못해 추천을 차단했습니다.",
    safety_authority: safetyAuthority,
  };
}

export function enforceWbRndInterimSafetyAuthority(value: unknown) {
  if (!validateWbRndInterimRecommendation(value)) {
    return {
      ok: false as const,
      response: buildWbRndInterimFailClosedResponse(
        "invalid_upstream_recommendation_contract"
      ),
    };
  }
  const safetyAuthority: WbRndInterimSafetyAuthority = {
    final: true,
    mode: "rnd_final",
    reason: null,
  };
  return {
    ok: true as const,
    response: {
      ...value,
      safety_authority: safetyAuthority,
    },
  };
}
