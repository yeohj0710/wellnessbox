import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeHyphenEasyLoginOrg } from "@/lib/shared/hyphen-login";
import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import { getNhisLink, upsertNhisLink } from "@/lib/server/hyphen/link";
import {
  getLatestNhisFetchCacheByIdentity,
  resolveNhisIdentityHash,
} from "@/lib/server/hyphen/fetch-cache";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
  logHyphenError,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { recordNhisOperationalAttempt } from "@/lib/server/hyphen/fetch-attempt";
import {
  clearPendingEasyAuth,
  getPendingEasyAuth,
  savePendingEasyAuth,
} from "@/lib/server/hyphen/session";
import { requireNhisSession } from "@/lib/server/route-auth";
export const runtime = "nodejs";
const SUMMARY_CACHE_TARGET_SETS = [
  ["checkupOverview", "medication"],
  ["checkupOverview"],
] as const;
const SUMMARY_CACHE_YEAR_LIMIT = 1;
const DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS = 90;
const NON_REUSABLE_LINK_ERROR_CODES = new Set(["LOGIN-999", "C0012-001"]);
const initSchema = z.object({
  loginMethod: z.literal("EASY").optional().default("EASY"),
  loginOrgCd: z.string().trim().min(1).max(20),
  resNm: z.string().trim().min(1).max(60),
  resNo: z
    .string()
    .trim()
    .regex(/^\d{8}$/),
  mobileNo: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/),
  forceInit: z.boolean().optional().default(false),
});
function badRequest(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}
function isSameIdentityInput(
  input: { loginOrgCd: string; resNm: string; resNo: string; mobileNo: string },
  pending: {
    loginOrgCd: string;
    resNm: string;
    resNo: string;
    mobileNo: string;
  }
) {
  return (
    input.loginOrgCd === pending.loginOrgCd &&
    input.resNm === pending.resNm &&
    input.resNo === pending.resNo &&
    input.mobileNo === pending.mobileNo
  );
}

function resolvePendingReuseMaxAgeSeconds() {
  const raw = process.env.HYPHEN_NHIS_PENDING_REUSE_MAX_AGE_SECONDS;
  if (!raw) return DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PENDING_REUSE_MAX_AGE_SECONDS;
  return Math.max(30, Math.min(900, Math.floor(parsed)));
}

function canReusePendingEasyAuth(
  pending:
    | {
        savedAt: string;
      }
    | null
) {
  if (!pending?.savedAt) return false;
  const savedAt = new Date(pending.savedAt).getTime();
  if (!Number.isFinite(savedAt)) return false;
  const ageMs = Date.now() - savedAt;
  if (ageMs < 0) return false;
  return ageMs <= resolvePendingReuseMaxAgeSeconds() * 1000;
}

function canReuseStoredStep(lastErrorCode: string | null | undefined) {
  const normalized = (lastErrorCode || "").trim().toUpperCase();
  if (!normalized) return true;
  return !NON_REUSABLE_LINK_ERROR_CODES.has(normalized);
}

function recordInitOperationalAttemptSafe(input: {
  appUserId: string;
  statusCode: number;
  ok: boolean;
  reason: string;
  identityHash?: string | null;
}) {
  void recordNhisOperationalAttempt({
    appUserId: input.appUserId,
    action: "init",
    statusCode: input.statusCode,
    ok: input.ok,
    reason: input.reason,
    identityHash: input.identityHash ?? null,
  }).catch((error) => {
    logHyphenError("[hyphen][init] failed to record operational attempt", error);
  });
}

export async function POST(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => null);
  if (!raw) return badRequest("Invalid JSON body");
  const parsed = initSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }
  const input = parsed.data;
  const forceInit = input.forceInit === true;
  const loginOrgCd = normalizeHyphenEasyLoginOrg(input.loginOrgCd);
  if (!loginOrgCd) return badRequest("loginOrgCd must be kakao");
  if (loginOrgCd !== "kakao") {
    return badRequest(
      "Only kakao loginOrgCd is supported in current deployment"
    );
  }
  const [existingLink, pendingEasyAuth] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    getPendingEasyAuth(),
  ]);
  const pendingReusable = canReusePendingEasyAuth(pendingEasyAuth);
  if (pendingEasyAuth && !pendingReusable) {
    await clearPendingEasyAuth().catch(() => undefined);
  }
  const identity = resolveNhisIdentityHash({
    appUserId: auth.data.appUserId,
    loginOrgCd,
    resNm: input.resNm,
    resNo: input.resNo,
    mobileNo: input.mobileNo,
  });
  const requestDefaults = buildNhisRequestDefaults();
  const replayableSummaryCache =
    (
      await Promise.all(
        SUMMARY_CACHE_TARGET_SETS.map((targets) =>
          getLatestNhisFetchCacheByIdentity({
            appUserId: auth.data.appUserId,
            identityHash: identity.identityHash,
            targets: [...targets],
            yearLimit: SUMMARY_CACHE_YEAR_LIMIT,
            subjectType: requestDefaults.subjectType,
          })
        )
      )
    ).find((item) => item !== null) ?? null;
  if (!forceInit && replayableSummaryCache) {
    await Promise.all([
      upsertNhisLink(auth.data.appUserId, {
        linked: true,
        loginMethod: "EASY",
        loginOrgCd,
        lastIdentityHash: identity.identityHash,
        lastLinkedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      clearPendingEasyAuth(),
    ]);
    recordInitOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 200,
      ok: true,
      reason: "reused_db_history",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      {
        ok: true,
        nextStep: "fetch",
        linked: true,
        reused: true,
        source: "db-history",
      },
      { headers: NO_STORE_HEADERS }
    );
  }
  if (
    !forceInit &&
    existingLink?.linked !== true &&
    existingLink?.stepData &&
    pendingEasyAuth &&
    pendingReusable &&
    canReuseStoredStep(existingLink.lastErrorCode) &&
    existingLink.lastIdentityHash === identity.identityHash &&
    isSameIdentityInput(
      {
        loginOrgCd,
        resNm: input.resNm,
        resNo: input.resNo,
        mobileNo: input.mobileNo,
      },
      pendingEasyAuth
    )
  ) {
    await upsertNhisLink(auth.data.appUserId, {
      linked: false,
      loginMethod: "EASY",
      loginOrgCd,
      lastIdentityHash: identity.identityHash,
      lastErrorCode: null,
      lastErrorMessage: null,
    });
    recordInitOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 200,
      ok: true,
      reason: "reused_step_data",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      { ok: true, nextStep: "sign", linked: false, reused: true },
      { headers: NO_STORE_HEADERS }
    );
  }
  try {
    const initResponse = await runWithHyphenInFlightDedup(
      "nhis-init",
      `${auth.data.appUserId}|${identity.identityHash}|${loginOrgCd}`,
      () =>
        fetchMedicalInfo({
          loginMethod: "EASY",
          loginOrgCd,
          resNm: input.resNm,
          resNo: input.resNo,
          mobileNo: input.mobileNo,
          ...requestDefaults,
          stepMode: "step",
          step: "init",
          showCookie: "Y",
        })
    );
    const stepData = extractStepData(initResponse);
    const cookieData = extractCookieData(initResponse);
    if (stepData == null) {
      throw new Error("Init response does not include stepData");
    }
    await Promise.all([
      upsertNhisLink(auth.data.appUserId, {
        linked: false,
        loginMethod: "EASY",
        loginOrgCd,
        stepMode: "step",
        stepData: toPrismaJson(stepData),
        cookieData: toPrismaJson(cookieData),
        lastIdentityHash: identity.identityHash,
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      savePendingEasyAuth({
        loginMethod: "EASY",
        loginOrgCd,
        resNm: input.resNm,
        resNo: input.resNo,
        mobileNo: input.mobileNo,
      }),
    ]);
    recordInitOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 200,
      ok: true,
      reason: "init_requested",
      identityHash: identity.identityHash,
    });
    return NextResponse.json(
      { ok: true, nextStep: "sign", linked: false },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    await upsertNhisLink(auth.data.appUserId, {
      linked: false,
      loginMethod: "EASY",
      loginOrgCd,
      lastIdentityHash: identity.identityHash,
      lastErrorCode: errorInfo.code ?? null,
      lastErrorMessage: errorInfo.message ?? null,
    });
    recordInitOperationalAttemptSafe({
      appUserId: auth.data.appUserId,
      statusCode: 502,
      ok: false,
      reason: errorInfo.code || "init_failed",
      identityHash: identity.identityHash,
    });
    return hyphenErrorToResponse(
      error,
      "인증 요청에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요."
    );
  }
}
