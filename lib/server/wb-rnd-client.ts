const DEFAULT_RND_RECOMMEND_TIMEOUT_MS = 4_000;
const MIN_RND_RECOMMEND_TIMEOUT_MS = 500;
const MAX_RND_RECOMMEND_TIMEOUT_MS = 15_000;

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

export type WbRndRecommendRequest = {
  request_id?: string;
  user_profile: {
    age: number;
    biological_sex: BiologicalSex;
    pregnant?: boolean;
  };
  goals: RecommendationGoal[];
  symptoms?: string[];
  conditions?: string[];
  medications?: Array<{ name: string; dose?: string | null }>;
  current_supplements?: Array<{ name: string; ingredients?: string[] }>;
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
  timeoutMs: number;
  serviceConfigured: boolean;
  upstreamStatus: number | null;
  requestedAt: string;
  response: unknown;
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
    request_id: payload.request_id ?? "wb-preview-fallback",
    decision_id: `wb-preview-fallback-${Date.now()}`,
    status: "needs_review",
    decision_summary: {
      headline: "R&D preview fallback",
      summary:
        "wellnessbox-rnd 응답을 받지 못해 preview 전용 fallback 결과를 반환했습니다.",
      confidence_band: "low",
    },
    normalized_focus_goals: fallbackGoals,
    safety_summary: {
      status: "needs_review",
      warnings: ["preview_fallback_active"],
      blocked_reasons: [],
      excluded_ingredients: [],
      rule_refs: [
        {
          rule_id: "preview_fallback",
          message: `fallback reason: ${reason}`,
          severity: "warning",
          source: "wellnessbox_preview",
        },
      ],
    },
    safety_flags: ["preview_fallback_active"],
    recommendations: [],
    next_action: "collect_more_input",
    follow_up_window_days: 14,
    follow_up_questions: [
      "수면 시간과 스트레스 수준을 다시 확인해 주세요.",
      "현재 복용 중인 약물과 건강기능식품을 구체적으로 입력해 주세요.",
    ],
    missing_information: [
      {
        code: "preview_fallback",
        question: "wellnessbox-rnd 연결 상태를 확인해 주세요.",
        reason,
        importance: "high",
      },
    ],
    limitations: [
      "이 응답은 preview 전용 fallback 입니다.",
      "실제 추천 의사결정은 wellnessbox-rnd 응답 성공 시에만 신뢰해야 합니다.",
      ...(errorMessage ? [`upstream error: ${errorMessage}`] : []),
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
  const timeoutMs = resolveWbRndRecommendTimeoutMs();
  const serviceBaseUrl = resolveWbRndServiceBaseUrl();
  const requestedAt = new Date().toISOString();
  const serviceConfigured = Boolean(serviceBaseUrl);

  if (!serviceConfigured) {
    return {
      ok: true,
      enabled: true,
      source: "fallback",
      usedFallback: true,
      fallbackReason: "service_base_url_missing",
      timeoutMs,
      serviceConfigured,
      upstreamStatus: null,
      requestedAt,
      response: buildFallbackRecommendResponse(
        payload,
        "service_base_url_missing"
      ),
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const token = resolveWbRndServiceToken();
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
      return {
        ok: true,
        enabled: true,
        source: "fallback",
        usedFallback: true,
        fallbackReason: "decode_error",
        timeoutMs,
        serviceConfigured,
        upstreamStatus: response.status,
        requestedAt,
        response: buildFallbackRecommendResponse(payload, "decode_error"),
      };
    }

    if (!response.ok) {
      return {
        ok: true,
        enabled: true,
        source: "fallback",
        usedFallback: true,
        fallbackReason: `upstream_${response.status}`,
        timeoutMs,
        serviceConfigured,
        upstreamStatus: response.status,
        requestedAt,
        response: buildFallbackRecommendResponse(
          payload,
          `upstream_${response.status}`
        ),
      };
    }

    return {
      ok: true,
      enabled: true,
      source: "rnd",
      usedFallback: false,
      fallbackReason: null,
      timeoutMs,
      serviceConfigured,
      upstreamStatus: response.status,
      requestedAt,
      response: parsed,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted/i.test(error.message));
    const fallbackReason = isTimeout ? "timeout" : "network_error";
    return {
      ok: true,
      enabled: true,
      source: "fallback",
      usedFallback: true,
      fallbackReason,
      timeoutMs,
      serviceConfigured,
      upstreamStatus: null,
      requestedAt,
      response: buildFallbackRecommendResponse(
        payload,
        fallbackReason,
        normalizeErrorMessage(error)
      ),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
