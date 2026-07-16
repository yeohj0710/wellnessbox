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
};

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
    return noStore(enforced.response, enforced.ok ? 200 : 502);
  } catch (error) {
    return recommendationProxyError(error);
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
