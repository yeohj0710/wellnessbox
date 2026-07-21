import { NextResponse } from "next/server";
import {
  callWbRndInterim,
  isWbRndInterimEnabled,
  pseudonymizeInterimUserId,
} from "@/lib/server/wb-rnd-interim-client";
import {
  requireAdminSession,
  requirePharmSession,
  requireUserSession,
} from "@/lib/server/route-auth";
import {
  buildWbRndInterimFailClosedResponse,
  enforceWbRndInterimSafetyAuthority,
} from "@/lib/server/wb-rnd-interim-safety-authority";
import {
  attachWbRndProductCandidates,
  listWbRndProductCatalog,
} from "@/lib/server/wb-rnd-product-candidates";
import { mapWellnessBoxProfileToWbRndRequest } from "@/lib/server/wb-rnd-profile-adapter";

type JsonRecord = Record<string, unknown>;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function disabled() {
  return noStore({ error: "TIPS interim feature disabled" }, 404);
}

async function readJson(req: Request): Promise<JsonRecord> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) throw new Error("request_too_large");
  const value: unknown = await req.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("json_object_required");
  }
  return value as JsonRecord;
}

async function proxyError(error: unknown) {
  const code = error instanceof Error ? error.message : "unknown_error";
  const timeout = error instanceof Error && error.name === "AbortError";
  return noStore({ error: timeout ? "R&D timeout" : code }, timeout ? 504 : 502);
}

async function recommendationProxyError(error: unknown) {
  const code = error instanceof Error ? error.message : "unknown_error";
  const timeout = error instanceof Error && error.name === "AbortError";
  return noStore(
    buildWbRndInterimFailClosedResponse(timeout ? "R&D timeout" : code),
    timeout ? 504 : 502
  );
}

export type WbRndRecommendationRouteDependencies = {
  requireUserSessionImpl: typeof requireUserSession;
  callWbRndInterimImpl: typeof callWbRndInterim;
  listProductCatalogImpl: typeof listWbRndProductCatalog;
};

export type WbRndProCorrectionRouteDependencies = {
  requireUserSessionImpl: typeof requireUserSession;
  callWbRndInterimImpl: typeof callWbRndInterim;
};

export type WbRndProPlanRouteDependencies = WbRndProCorrectionRouteDependencies;

export async function runUserInterimStatusRoute() {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  try {
    return noStore(await callWbRndInterim("/v1/interim/status", "GET"));
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimProfileRoute(req: Request) {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    const payload = {
      profile_id: pseudonymizeInterimUserId(auth.data.appUserId),
      consent_scopes: Array.isArray(body.consent_scopes) ? body.consent_scopes : [],
      profile: typeof body.profile === "object" && body.profile ? body.profile : {},
    };
    return noStore(await callWbRndInterim("/v1/interim/profiles", "POST", payload));
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimRecommendationRoute(
  req: Request,
  dependencies: Partial<WbRndRecommendationRouteDependencies> = {}
) {
  if (!isWbRndInterimEnabled()) return disabled();
  const authenticate = dependencies.requireUserSessionImpl ?? requireUserSession;
  const callInterim = dependencies.callWbRndInterimImpl ?? callWbRndInterim;
  const listProductCatalog =
    dependencies.listProductCatalogImpl ?? listWbRndProductCatalog;
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    const upstream = await callInterim<unknown>(
      "/v1/interim/recommendations",
      "POST",
      {
        ...body,
        profile_id: pseudonymizeInterimUserId(auth.data.appUserId),
      }
    );
    const enforced = enforceWbRndInterimSafetyAuthority(upstream);
    if (!enforced.ok) return noStore(enforced.response, 502);
    const recommendationCount = Array.isArray(enforced.response.recommendations)
      ? enforced.response.recommendations.length
      : 0;
    if (recommendationCount === 0) return noStore(enforced.response, 200);
    const productCatalog = await listProductCatalog();
    const withProductCandidates = attachWbRndProductCandidates(
      enforced.response,
      productCatalog
    );
    return noStore(withProductCandidates, 200);
  } catch (error) {
    return recommendationProxyError(error);
  }
}

export async function runUserInterimProCorrectionRoute(
  req: Request,
  dependencies: Partial<WbRndProCorrectionRouteDependencies> = {}
) {
  if (!isWbRndInterimEnabled()) return disabled();
  const authenticate = dependencies.requireUserSessionImpl ?? requireUserSession;
  const callInterim = dependencies.callWbRndInterimImpl ?? callWbRndInterim;
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    return noStore(
      await callInterim(
        "/v1/interim/pro/followups/correct-and-recalculate",
        "POST",
        {
          ...body,
          profile_id: pseudonymizeInterimUserId(auth.data.appUserId),
        }
      )
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimProPlanRoute(
  req: Request,
  dependencies: Partial<WbRndProPlanRouteDependencies> = {}
) {
  if (!isWbRndInterimEnabled()) return disabled();
  const authenticate = dependencies.requireUserSessionImpl ?? requireUserSession;
  const callInterim = dependencies.callWbRndInterimImpl ?? callWbRndInterim;
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    if (body.consentAccepted !== true) {
      return noStore({ error: "PRO 설문 저장에 동의해야 합니다." }, 400);
    }
    if (typeof body.requestId !== "string" || !/^pro_[a-f0-9]{32}$/.test(body.requestId)) {
      return noStore({ error: "PRO 등록 요청 ID가 올바르지 않습니다." }, 400);
    }
    const dataClass = body.dataClass ?? "SYNTHETIC_OUTCOME_PROXY";
    if (dataClass !== "SYNTHETIC_OUTCOME_PROXY" && dataClass !== "REAL_WORLD_OUTCOME") {
      return noStore({ error: "PRO 결과 데이터 종류가 올바르지 않습니다." }, 400);
    }
    const subjectId = pseudonymizeInterimUserId(auth.data.appUserId);
    const recommendationRequest = mapWellnessBoxProfileToWbRndRequest(body.profile, {
      requestId: body.requestId,
      subjectId,
      surveyConsent: {
        useForRecommendation: true,
        allowPersistentStorage: true,
      },
    });
    return noStore(
      await callInterim("/v1/interim/pro/plans", "POST", {
        recommendation_request: recommendationRequest,
        baseline: body.baseline,
        observed_at: body.observedAt,
        data_class: dataClass,
      })
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimProFollowUpRoute(
  req: Request,
  dependencies: Partial<WbRndProCorrectionRouteDependencies> = {}
) {
  if (!isWbRndInterimEnabled()) return disabled();
  const authenticate = dependencies.requireUserSessionImpl ?? requireUserSession;
  const callInterim = dependencies.callWbRndInterimImpl ?? callWbRndInterim;
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    return noStore(
      await callInterim("/v1/interim/pro/followups", "POST", {
        execution_id: body.executionId,
        profile_id: pseudonymizeInterimUserId(auth.data.appUserId),
        plan_id: body.planId,
        timepoint: body.timepoint,
        answers: body.answers,
        observed_at: body.observedAt,
        actual_day_index: body.actualDayIndex,
        planned_dose_count: body.plannedDoseCount,
        taken_dose_count: body.takenDoseCount,
        adverse_events: body.adverseEvents ?? [],
        discontinuation_reason: body.discontinuationReason ?? null,
      })
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimAgentRoute(req: Request) {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    const profileId = pseudonymizeInterimUserId(auth.data.appUserId);
    const argumentsValue =
      body.arguments && typeof body.arguments === "object" ? body.arguments : {};
    return noStore(
      await callWbRndInterim("/v1/interim/agent/tools", "POST", {
        ...body,
        arguments: { ...argumentsValue, profile_id: profileId },
      })
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimAgentRunRoute(req: Request) {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    const profileId = pseudonymizeInterimUserId(auth.data.appUserId);
    const rawKey = typeof body.idempotency_key === "string" ? body.idempotency_key : "";
    const idempotencyKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (!idempotencyKey) throw new Error("idempotency_key_required");
    const query = new URLSearchParams({
      profile_id: profileId,
      idempotency_key: idempotencyKey,
    });
    return noStore(
      await callWbRndInterim(`/v1/interim/agent/runs?${query}`, "POST")
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runUserInterimConnectorRoute(req: Request) {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req);
    return noStore(
      await callWbRndInterim("/v1/interim/connectors/device", "POST", {
        ...body,
        profile_id: pseudonymizeInterimUserId(auth.data.appUserId),
      })
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runPharmInterimReviewsRoute() {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requirePharmSession();
  if (!auth.ok) return auth.response;
  try {
    const query = new URLSearchParams({ pharmacy_id: String(auth.data.pharmacyId) });
    return noStore(
      await callWbRndInterim(`/v1/interim/admin/reviews?${query}`, "GET")
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runPharmInterimDecisionRoute(req: Request, reviewId: string) {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requirePharmSession();
  if (!auth.ok) return auth.response;
  if (!/^review_[a-f0-9]+$/.test(reviewId)) return noStore({ error: "invalid review id" }, 400);
  try {
    const body = await readJson(req);
    return noStore(
      await callWbRndInterim(
        `/v1/interim/admin/reviews/${reviewId}/decision`,
        "POST",
        { ...body, pharmacy_id: auth.data.pharmacyId }
      )
    );
  } catch (error) {
    return proxyError(error);
  }
}

export async function runAdminInterimDashboardRoute() {
  if (!isWbRndInterimEnabled()) return disabled();
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  try {
    const [status, kpis, sources] = await Promise.all([
      callWbRndInterim("/v1/interim/status", "GET"),
      callWbRndInterim("/v1/interim/kpis", "GET"),
      callWbRndInterim("/v1/interim/admin/sources", "GET"),
    ]);
    return noStore({ status, kpis, sources });
  } catch (error) {
    return proxyError(error);
  }
}
