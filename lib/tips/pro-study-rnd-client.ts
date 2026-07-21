import type { ProAnswers, ProInstrumentId } from "@/lib/tips/pro-study-engine";

type JsonRecord = Record<string, unknown>;

export type ProPlanEnrollmentResult = {
  executionId: string;
  planId: string;
  baselineEventId: string;
  recommendation: string[];
  rawScore: number;
  dataClass: ProOutcomeDataClass;
};

export type ProOutcomeDataClass = "SYNTHETIC_OUTCOME_PROXY" | "REAL_WORLD_OUTCOME";

export type ProFollowUpResult = {
  operation: "created" | "corrected";
  eventId: string;
  rawScore: number;
  interpretation: JsonRecord;
  lineage: JsonRecord;
  actionDecision: JsonRecord;
};

async function postJson(path: string, payload: unknown): Promise<JsonRecord> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === "object" && "error" in value
      ? String((value as JsonRecord).error)
      : `PRO 요청 실패 (${response.status})`;
    throw new Error(message);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("PRO 응답 형식이 올바르지 않습니다.");
  }
  return value as JsonRecord;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`PRO 응답에 ${field} 값이 없습니다.`);
  return value;
}

export async function enrollProPlan(input: {
  requestId: string;
  profile: { name?: string; age: number; sex: "male" | "female" | "other"; goals: string[] };
  baseline: ProAnswers;
  observedAt: string;
  consentAccepted: boolean;
  dataClass: ProOutcomeDataClass;
}): Promise<ProPlanEnrollmentResult> {
  const value = await postJson("/api/tips/pro/plans", {
    requestId: input.requestId,
    profile: input.profile,
    baseline: { instrument: input.baseline.instrument, item_scores: input.baseline.responses },
    observedAt: input.observedAt,
    consentAccepted: input.consentAccepted,
    dataClass: input.dataClass,
  });
  const recommendation = value.recommendation as JsonRecord | undefined;
  const candidates = recommendation?.recommendations;
  const baseline = value.baseline as JsonRecord | undefined;
  const instrumentScores = baseline?.instrument_scores;
  if (!Array.isArray(candidates) || !Array.isArray(instrumentScores)) {
    throw new Error("PRO 등록 응답의 추천 또는 점수 정보가 올바르지 않습니다.");
  }
  return {
    executionId: requiredString(value.execution_id, "execution_id"),
    planId: requiredString(value.plan_id, "plan_id"),
    baselineEventId: requiredString(value.baseline_event_id, "baseline_event_id"),
    recommendation: candidates.map((item) => requiredString((item as JsonRecord).ingredient_key, "ingredient_key")),
    rawScore: Number((instrumentScores[0] as JsonRecord).raw_score),
    dataClass: requiredString(baseline?.data_class, "data_class") as ProOutcomeDataClass,
  };
}

export async function saveProFollowup(input: {
  executionId: string;
  planId: string;
  timepoint: "week_2" | "week_4";
  answers: { instrument: ProInstrumentId; responses: number[] };
  observedAt: string;
  actualDayIndex: number;
  plannedDoseCount: number;
  takenDoseCount: number;
  adverseEvents: JsonRecord[];
}): Promise<ProFollowUpResult> {
  const value = await postJson("/api/tips/pro/effects", {
    ...input,
    answers: { instrument: input.answers.instrument, item_scores: input.answers.responses },
  });
  if (value.operation !== "created" && value.operation !== "corrected") {
    throw new Error("PRO 추적 응답의 operation 값이 올바르지 않습니다.");
  }
  if (!value.interpretation || typeof value.interpretation !== "object") {
    throw new Error("PRO 추적 응답에 해석 결과가 없습니다.");
  }
  if (!value.lineage || typeof value.lineage !== "object") {
    throw new Error("PRO 추적 응답에 계획 연결 정보가 없습니다.");
  }
  if (!value.action_decision || typeof value.action_decision !== "object") {
    throw new Error("PRO 추적 응답에 다음 행동 결정이 없습니다.");
  }
  return {
    operation: value.operation,
    eventId: requiredString(value.event_id, "event_id"),
    rawScore: Number(value.raw_score),
    interpretation: value.interpretation as JsonRecord,
    lineage: value.lineage as JsonRecord,
    actionDecision: value.action_decision as JsonRecord,
  };
}
