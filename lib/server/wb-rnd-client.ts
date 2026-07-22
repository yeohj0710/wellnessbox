import { randomUUID } from "node:crypto";

import type { UserProfile } from "@/types/chat";
import { resolveWbRndResultOrigin, type WbRndResultOrigin } from "@/lib/wb-rnd-result-origin";
import { resolveWbRndEnvironmentContract } from "@/lib/server/wb-rnd-environment";

const DEFAULT_RND_RECOMMEND_TIMEOUT_MS = 4_000;
const MIN_RND_RECOMMEND_TIMEOUT_MS = 500;
const MAX_RND_RECOMMEND_TIMEOUT_MS = 15_000;
const RECOMMENDATION_GOALS = new Set([
  "stress_support",
  "sleep_support",
  "immunity_support",
  "energy_support",
  "gut_health",
  "bone_joint",
  "heart_health",
  "blood_glucose",
  "general_wellness",
]);

type BiologicalSex = "female" | "male" | "other" | "undisclosed";
type RecommendationGoal =
  | "stress_support"
  | "sleep_support"
  | "immunity_support"
  | "energy_support"
  | "gut_health"
  | "bone_joint"
  | "heart_health"
  | "blood_glucose"
  | "general_wellness";
type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active";
type BudgetLevel = "low" | "medium" | "high";
type WbRndDataSourceConsent = {
  use_for_recommendation: boolean;
  allow_persistent_storage: boolean;
};

export type WbRndRecommendRequest = {
  request_id?: string;
  plan_id?: string;
  source_profile?: {
    schema_version: "wellnessbox.chat.UserProfile.v1";
    subject_id?: `usr_${string}`;
    profile: UserProfile;
  };
  user_profile: {
    age: number;
    biological_sex: BiologicalSex;
    pregnant?: boolean;
    height_cm?: number;
    weight_kg?: number;
  };
  goals: RecommendationGoal[];
  symptoms?: string[];
  conditions?: string[];
  allergies?: string[];
  risk_flags?: string[];
  medications?: Array<{ name: string; dose?: string | null }>;
  current_supplements?: Array<{ name: string; ingredients?: string[] }>;
  dietary_patterns?: string[];
  laboratory_observations?: unknown[];
  lifestyle?: {
    sleep_hours?: number | null;
    stress_level?: number | null;
    activity_level?: ActivityLevel;
    smoker?: boolean;
    alcohol_per_week?: number;
  };
  input_availability?: {
    survey?: boolean;
    nhis?: boolean;
    wearable?: boolean;
    cgm?: boolean;
    genetic?: boolean;
  };
  data_source_consents?: {
    survey: WbRndDataSourceConsent;
    nhis: WbRndDataSourceConsent;
    wearable: WbRndDataSourceConsent;
    cgm: WbRndDataSourceConsent;
    genetic: WbRndDataSourceConsent;
  };
  preferences?: {
    budget_level?: BudgetLevel;
    max_products?: number;
    avoid_ingredients?: string[];
  };
};

export type WbRndPreviewDisabledResult = {
  ok: false;
  enabled: false;
  reason: "disabled";
  timeoutMs: number;
  samplePayload: WbRndRecommendRequest;
};

export type WbRndPreviewCallResult = {
  ok: true;
  enabled: true;
  source: "rnd" | "fallback";
  usedFallback: boolean;
  fallbackReason: string | null;
  safetyAuthority: {
    final: true;
    mode: "rnd_final" | "service_fail_closed";
    reason: string | null;
  };
  timeoutMs: number;
  serviceConfigured: boolean;
  upstreamStatus: number | null;
  requestedAt: string;
  response: unknown;
  resultOrigin: WbRndResultOrigin;
};

export const WB_RND_RECOMMEND_PREVIEW_SAMPLE: WbRndRecommendRequest = {
  request_id: "wb-preview-sample-001",
  user_profile: {
    age: 34,
    biological_sex: "female",
    pregnant: false,
  },
  goals: ["stress_support", "sleep_support"],
  symptoms: ["late_sleep", "fatigue"],
  conditions: [],
  allergies: [],
  risk_flags: [],
  medications: [{ name: "magnesium", dose: "200mg" }],
  current_supplements: [{ name: "multivitamin", ingredients: ["vitamin_b_complex"] }],
  lifestyle: {
    sleep_hours: 5.5,
    stress_level: 4,
    activity_level: "lightly_active",
    smoker: false,
    alcohol_per_week: 1,
  },
  input_availability: {
    survey: true,
    nhis: false,
    wearable: false,
    cgm: false,
    genetic: false,
  },
  preferences: {
    budget_level: "medium",
    max_products: 2,
    avoid_ingredients: [],
  },
};

function isTruthyFlag(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return "unknown_error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecommendationGoalArray(value: unknown) {
  return (
    isStringArray(value) && value.every((item) => RECOMMENDATION_GOALS.has(item))
  );
}

function isIsoDateTime(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isCitation(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.reference_id === "string" &&
    (value.claim_id === null || typeof value.claim_id === "string") &&
    typeof value.source_title === "string" &&
    typeof value.source_type === "string" &&
    typeof value.page_or_section === "string" &&
    typeof value.excerpt === "string" &&
    typeof value.reference_uri === "string"
  );
}

function isRuleReference(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.rule_id === "string" &&
    Number.isInteger(value.rule_version) &&
    Number(value.rule_version) >= 1 &&
    typeof value.message === "string" &&
    (value.application_reason === null ||
      ["dose_evidence_incomplete", "upper_limit_exceeded"].includes(
        String(value.application_reason)
      )) &&
    ["info", "warning", "blocker"].includes(String(value.severity)) &&
    typeof value.source === "string" &&
    isStringArray(value.reference_ids) &&
    isStringArray(value.claim_ids) &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation)
  );
}

function isDoseAggregate(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.ingredient_key === "string" &&
    Number.isInteger(value.product_count) &&
    Number(value.product_count) >= 1 &&
    isStringArray(value.product_names) &&
    typeof value.duplicate_across_products === "boolean" &&
    (value.total_daily_amount === null ||
      (typeof value.total_daily_amount === "number" &&
        Number.isFinite(value.total_daily_amount) &&
        value.total_daily_amount >= 0)) &&
    (value.unit === null || typeof value.unit === "string") &&
    Number.isInteger(value.dose_input_count) &&
    Number(value.dose_input_count) >= 0 &&
    Number.isInteger(value.dose_observation_count) &&
    Number(value.dose_observation_count) >= 0 &&
    typeof value.dose_complete === "boolean"
  );
}

function isSafetyEvidence(value: unknown) {
  return (
    isRecord(value) &&
    ["rule", "excluded_ingredient", "user_preference"].includes(
      String(value.evidence_type)
    ) &&
    typeof value.code === "string" &&
    typeof value.summary === "string" &&
    isStringArray(value.reference_ids)
  );
}

function isMissingInformation(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.question === "string" &&
    typeof value.reason === "string" &&
    ["low", "medium", "high"].includes(String(value.importance))
  );
}

function isLimitationDetail(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.summary === "string"
  );
}

function isRecommendationCandidate(value: unknown) {
  if (!isRecord(value) || !isRecord(value.score_breakdown)) return false;
  const scoreBreakdown = value.score_breakdown;
  const scoreFields = [
    "goal_alignment",
    "symptom_alignment",
    "lifestyle_alignment",
    "evidence_readiness",
    "budget_adjustment",
    "safety_adjustment",
    "conservative_adjustment",
    "learned_effect_bonus",
    "total",
  ];
  return (
    typeof value.ingredient_key === "string" &&
    typeof value.display_name === "string" &&
    typeof value.rationale === "string" &&
    isRecommendationGoalArray(value.expected_support_goals) &&
    isStringArray(value.rule_refs) &&
    scoreFields.every(
      (field) =>
        typeof scoreBreakdown[field] === "number" &&
        Number.isFinite(scoreBreakdown[field])
    ) &&
    typeof value.follow_up_focus === "string"
  );
}

function validateWbRndRecommendResponse(value: unknown) {
  if (!isRecord(value)) return false;
  const status = value.status;
  const safetySummary = value.safety_summary;
  const recommendations = value.recommendations;
  const metadata = value.metadata;
  const decisionSummary = value.decision_summary;
  const nextActionRationale = value.next_action_rationale;
  if (
    typeof value.execution_id !== "string" ||
    !/^exec_[a-f0-9]{32}$/.test(value.execution_id) ||
    typeof value.request_id !== "string" ||
    typeof value.decision_id !== "string" ||
    !["ok", "needs_review", "blocked"].includes(String(status)) ||
    !Array.isArray(recommendations) ||
    !recommendations.every(isRecommendationCandidate) ||
    !isRecord(safetySummary) ||
    !["ok", "needs_review", "blocked"].includes(String(safetySummary.status)) ||
    !isStringArray(safetySummary.blocked_reasons) ||
    !Array.isArray(safetySummary.rule_refs) ||
    !safetySummary.rule_refs.every(isRuleReference) ||
    !isIsoDateTime(safetySummary.applied_at) ||
    !isStringArray(safetySummary.warnings) ||
    !isStringArray(safetySummary.excluded_ingredients) ||
    !isStringArray(safetySummary.duplicate_ingredient_keys) ||
    !Array.isArray(safetySummary.ingredient_dose_aggregates) ||
    !safetySummary.ingredient_dose_aggregates.every(isDoseAggregate) ||
    !isRecord(decisionSummary) ||
    typeof decisionSummary.headline !== "string" ||
    typeof decisionSummary.summary !== "string" ||
    !["low", "medium", "high"].includes(String(decisionSummary.confidence_band)) ||
    !isRecommendationGoalArray(value.normalized_focus_goals) ||
    !isStringArray(value.safety_flags) ||
    !Array.isArray(value.safety_evidence) ||
    !value.safety_evidence.every(isSafetyEvidence) ||
    ![
      "blocked",
      "ask_targeted_followup",
      "trigger_safety_recheck",
      "start_plan",
      "continue_plan",
      "re_optimize",
      "reduce_or_stop",
      "monitor_only",
      "collect_more_input",
    ].includes(String(value.next_action)) ||
    !isRecord(nextActionRationale) ||
    typeof nextActionRationale.reason_code !== "string" ||
    typeof nextActionRationale.summary !== "string" ||
    !isStringArray(nextActionRationale.supporting_codes) ||
    !Number.isInteger(value.follow_up_window_days) ||
    Number(value.follow_up_window_days) < 1 ||
    Number(value.follow_up_window_days) > 90 ||
    !isStringArray(value.follow_up_questions) ||
    !Array.isArray(value.missing_information) ||
    !value.missing_information.every(isMissingInformation) ||
    !isStringArray(value.limitations) ||
    !Array.isArray(value.limitation_details) ||
    !value.limitation_details.every(isLimitationDetail) ||
    !isRecord(metadata) ||
    typeof metadata.engine_version !== "string" ||
    typeof metadata.mode !== "string" ||
    !isIsoDateTime(metadata.generated_at)
  ) {
    return false;
  }

  const topLevelBlocked = status === "blocked";
  const safetyBlocked = safetySummary.status === "blocked";
  if (topLevelBlocked !== safetyBlocked) return false;
  if (status === "ok" && safetySummary.status !== "ok") return false;
  if (topLevelBlocked && recommendations.length > 0) return false;
  return true;
}

export function isWbRndRecommendPreviewEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return (
    isTruthyFlag(process.env.WB_RND_PREVIEW_ENABLED) ||
    isTruthyFlag(process.env.WB_RND_RECOMMEND_ENABLED)
  );
}

export function resolveWbRndServiceBaseUrl() {
  return normalizeBaseUrl(process.env.WB_RND_SERVICE_BASE_URL);
}

export function resolveWbRndRecommendTimeoutMs() {
  const raw = Number.parseInt(process.env.WB_RND_RECOMMEND_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_RND_RECOMMEND_TIMEOUT_MS;
  return clamp(raw, MIN_RND_RECOMMEND_TIMEOUT_MS, MAX_RND_RECOMMEND_TIMEOUT_MS);
}

function resolveWbRndServiceToken() {
  return (process.env.WB_RND_SERVICE_TOKEN ?? "").trim();
}

function buildFallbackRecommendResponse(
  payload: WbRndRecommendRequest,
  reason: string,
  errorMessage?: string
) {
  const fallbackGoals = Array.isArray(payload.goals) ? payload.goals : [];
  return {
    execution_id: `exec_${randomUUID().replaceAll("-", "")}`,
    request_id: payload.request_id ?? "wb-preview-fallback",
    decision_id: `wb-preview-fallback-${Date.now()}`,
    status: "blocked",
    decision_summary: {
      headline: "R&D 추천 차단",
      summary: "R&D 추천 서비스의 최종 안전 판정을 확인하지 못해 추천을 차단했습니다.",
      confidence_band: "low",
    },
    normalized_focus_goals: fallbackGoals,
    safety_summary: {
      applied_at: new Date().toISOString(),
      status: "blocked",
      warnings: ["service_fail_closed"],
      blocked_reasons: [`R&D final safety authority unavailable: ${reason}`],
      excluded_ingredients: [],
      rule_refs: [
        {
          rule_id: "preview_fallback",
          rule_version: 1,
          application_reason: null,
          message: `recommendation blocked because ${reason}`,
          severity: "blocker",
          source: "wellnessbox_preview",
          reference_ids: [],
          claim_ids: [],
          citations: [],
        },
      ],
      duplicate_ingredient_keys: [],
      ingredient_dose_aggregates: [],
    },
    safety_flags: ["service_fail_closed", reason],
    safety_evidence: [],
    recommendations: [],
    next_action: "blocked",
    next_action_rationale: {
      reason_code: "service_fail_closed",
      summary: "R&D 안전 엔진의 최종 판정을 확인하지 못했습니다.",
      supporting_codes: ["SERVICE-RND-FINAL-AUTHORITY-001"],
    },
    follow_up_window_days: 14,
    follow_up_questions: [
      "R&D 추천 서비스 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    ],
    missing_information: [
      {
        code: "preview_fallback",
        question: "R&D 추천 서비스 연결 상태를 확인해 주세요.",
        reason,
        importance: "high",
      },
    ],
    limitations: [
      "이 응답은 서비스 연결 실패 시 적용하는 안전 차단 결과입니다.",
      "R&D 안전 엔진의 정상 응답을 확인하기 전에는 추천을 제공하지 않습니다.",
      ...(errorMessage ? [`upstream error: ${errorMessage}`] : []),
    ],
    limitation_details: [
      {
        code: "service_fail_closed",
        summary: "R&D 안전 엔진 연결을 확인하기 전에는 추천을 제공하지 않습니다.",
      },
    ],
    metadata: {
      engine_version: "wellnessbox-preview-fallback",
      mode: "preview_fallback",
      generated_at: new Date().toISOString(),
    },
  };
}

function buildDisabledResult(): WbRndPreviewDisabledResult {
  return {
    ok: false,
    enabled: false,
    reason: "disabled",
    timeoutMs: resolveWbRndRecommendTimeoutMs(),
    samplePayload: WB_RND_RECOMMEND_PREVIEW_SAMPLE,
  };
}

export function getWbRndRecommendPreviewBootstrap() {
  if (!isWbRndRecommendPreviewEnabled()) return buildDisabledResult();
  return {
    ok: true as const,
    enabled: true as const,
    timeoutMs: resolveWbRndRecommendTimeoutMs(),
    serviceConfigured: Boolean(resolveWbRndServiceBaseUrl()),
    samplePayload: WB_RND_RECOMMEND_PREVIEW_SAMPLE,
  };
}

export async function callWbRndRecommendPreview(
  payload: WbRndRecommendRequest,
  options?: {
    fetchImpl?: typeof fetch;
  }
): Promise<WbRndPreviewCallResult> {
  const strictContract = isTruthyFlag(process.env.WB_RND_RECOMMEND_ENABLED)
    ? resolveWbRndEnvironmentContract()
    : null;
  const timeoutMs = strictContract?.enabled
    ? strictContract.timeoutMs
    : resolveWbRndRecommendTimeoutMs();
  const serviceBaseUrl = strictContract?.enabled
    ? strictContract.baseUrl
    : resolveWbRndServiceBaseUrl();
  const requestedAt = new Date().toISOString();
  const serviceConfigured = Boolean(serviceBaseUrl);

  if (!serviceConfigured) {
    const response = buildFallbackRecommendResponse(
      payload,
      "service_base_url_missing"
    );
    return {
      ok: true,
      enabled: true,
      source: "fallback",
      usedFallback: true,
      fallbackReason: "service_base_url_missing",
      safetyAuthority: {
        final: true,
        mode: "service_fail_closed",
        reason: "service_base_url_missing",
      },
      timeoutMs,
      serviceConfigured,
      upstreamStatus: null,
      requestedAt,
      response,
      resultOrigin: resolveWbRndResultOrigin({
        source: "fallback",
        response,
        requestedAt,
        fallbackReason: "service_base_url_missing",
      }),
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const token = strictContract?.enabled
    ? strictContract.token
    : resolveWbRndServiceToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetchImpl(`${serviceBaseUrl}/v1/recommend`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      const fallbackResponse = buildFallbackRecommendResponse(payload, "decode_error");
      return {
        ok: true,
        enabled: true,
        source: "fallback",
        usedFallback: true,
        fallbackReason: "decode_error",
        safetyAuthority: {
          final: true,
          mode: "service_fail_closed",
          reason: "decode_error",
        },
        timeoutMs,
        serviceConfigured,
        upstreamStatus: response.status,
        requestedAt,
        response: fallbackResponse,
        resultOrigin: resolveWbRndResultOrigin({ source: "fallback", response: fallbackResponse, requestedAt, fallbackReason: "decode_error" }),
      };
    }

    if (!response.ok) {
      const fallbackReason = `upstream_${response.status}`;
      const fallbackResponse = buildFallbackRecommendResponse(payload, fallbackReason);
      return {
        ok: true,
        enabled: true,
        source: "fallback",
        usedFallback: true,
        fallbackReason,
        safetyAuthority: {
          final: true,
          mode: "service_fail_closed",
          reason: fallbackReason,
        },
        timeoutMs,
        serviceConfigured,
        upstreamStatus: response.status,
        requestedAt,
        response: fallbackResponse,
        resultOrigin: resolveWbRndResultOrigin({ source: "fallback", response: fallbackResponse, requestedAt, fallbackReason }),
      };
    }

    if (!validateWbRndRecommendResponse(parsed)) {
      const fallbackResponse = buildFallbackRecommendResponse(payload, "invalid_upstream_contract");
      return {
        ok: true,
        enabled: true,
        source: "fallback",
        usedFallback: true,
        fallbackReason: "invalid_upstream_contract",
        safetyAuthority: {
          final: true,
          mode: "service_fail_closed",
          reason: "invalid_upstream_contract",
        },
        timeoutMs,
        serviceConfigured,
        upstreamStatus: response.status,
        requestedAt,
        response: fallbackResponse,
        resultOrigin: resolveWbRndResultOrigin({ source: "fallback", response: fallbackResponse, requestedAt, fallbackReason: "invalid_upstream_contract" }),
      };
    }

    return {
      ok: true,
      enabled: true,
      source: "rnd",
      usedFallback: false,
      fallbackReason: null,
      safetyAuthority: {
        final: true,
        mode: "rnd_final",
        reason: null,
      },
      timeoutMs,
      serviceConfigured,
      upstreamStatus: response.status,
      requestedAt,
      response: parsed,
      resultOrigin: resolveWbRndResultOrigin({ source: "rnd", response: parsed, requestedAt, fallbackReason: null }),
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted/i.test(error.message));
    const fallbackReason = isTimeout ? "timeout" : "network_error";
    const response = buildFallbackRecommendResponse(
      payload,
      fallbackReason,
      normalizeErrorMessage(error)
    );
    return {
      ok: true,
      enabled: true,
      source: "fallback",
      usedFallback: true,
      fallbackReason,
      safetyAuthority: {
        final: true,
        mode: "service_fail_closed",
        reason: fallbackReason,
      },
      timeoutMs,
      serviceConfigured,
      upstreamStatus: null,
      requestedAt,
      response,
      resultOrigin: resolveWbRndResultOrigin({ source: "fallback", response, requestedAt, fallbackReason }),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
