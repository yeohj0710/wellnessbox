import { NextResponse } from "next/server";
import { z } from "zod";
import {
  NHIS_FETCH_DAILY_LIMIT_ERR_CODE,
  NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
  NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE,
  NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import { NHIS_FETCH_TARGETS } from "@/lib/server/hyphen/fetch-contract";
import type { NhisFetchTarget } from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  evaluateNhisFetchBudget,
  recordNhisFetchAttempt,
} from "@/lib/server/hyphen/fetch-attempt";
import {
  buildNhisFetchRequestHash,
  getLatestNhisFetchAttemptAt,
  resolveNhisIdentityHash,
  runWithNhisFetchDedup,
} from "@/lib/server/hyphen/fetch-cache";
import {
  persistNhisFetchResult,
  tryServeNhisFetchCache,
} from "@/lib/server/hyphen/fetch-route-cache";
import {
  dedupeNhisFetchTargets,
  resolveNhisEffectiveYearLimit,
} from "@/lib/server/hyphen/fetch-request-policy";
import {
  computeNhisForceRefreshCooldown,
  pickMostRecentDate,
  resolveNhisForceRefreshCacheGuardSeconds,
} from "@/lib/server/hyphen/fetch-policy";
import { getNhisLink } from "@/lib/server/hyphen/link";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  logHyphenError,
  NO_STORE_HEADERS,
} from "@/lib/server/hyphen/route-utils";
import { resolveBlockedNhisFetchTargets } from "@/lib/server/hyphen/target-policy";
import { requireNhisSession } from "@/lib/server/route-auth";
export const runtime = "nodejs";
const NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE = "LOGIN-999";
const targetEnum = z.enum(NHIS_FETCH_TARGETS);
const fetchSchema = z
  .object({
    targets: z.array(targetEnum).min(1).optional(),
    yearLimit: z.number().int().min(1).max(5).optional(),
    forceRefresh: z.boolean().optional(),
  })
  .optional();
function dedupeTargets(input?: NhisFetchTarget[]) {
  return dedupeNhisFetchTargets(input);
}
function buildBasePayload(options: {
  linkLoginMethod: string | null | undefined;
  linkLoginOrgCd: string | null | undefined;
  linkCookieData: unknown;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
}): HyphenNhisRequestPayload {
  return {
    loginMethod: (options.linkLoginMethod as "EASY" | "CERT" | null) ?? "EASY",
    loginOrgCd: options.linkLoginOrgCd ?? undefined,
    ...options.requestDefaults,
    cookieData: options.linkCookieData ?? undefined,
    showCookie: "Y" as const,
  };
}
function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}
async function recordNhisFetchAttemptSafe(input: {
  appUserId: string;
  identityHash: string;
  requestHash: string;
  requestKey: string;
  forceRefresh: boolean;
  statusCode: number;
  ok: boolean;
}) {
  try {
    await recordNhisFetchAttempt({ ...input, cached: false });
  } catch (error) {
    logHyphenError("[hyphen][fetch] failed to record fetch attempt", error);
  }
}
export async function POST(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const parsed = fetchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const targets = dedupeTargets(parsed.data?.targets);
  const effectiveYearLimit = resolveNhisEffectiveYearLimit(
    targets,
    parsed.data?.yearLimit
  );
  const forceRefresh = parsed.data?.forceRefresh === true;
  const blockedTargets = resolveBlockedNhisFetchTargets(targets);
  if (blockedTargets.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Current cost policy allows checkup targets only.",
        errCd: NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
        errMsg: `Blocked targets: ${blockedTargets.join(", ")}`,
        blockedTargets,
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const [link, latestFetchAttemptAt] = await Promise.all([
    getNhisLink(auth.data.appUserId),
    forceRefresh
      ? getLatestNhisFetchAttemptAt(auth.data.appUserId)
      : Promise.resolve(null),
  ]);
  const requestDefaults = buildNhisRequestDefaults();
  if (!link?.linked) {
    return NextResponse.json(
      { ok: false, error: "Link is not completed. Run init/sign first." },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }
  const identity = resolveNhisIdentityHash({
    appUserId: auth.data.appUserId,
    loginOrgCd: link.loginOrgCd,
    storedIdentityHash: link.lastIdentityHash,
  });
  const requestHashMeta = buildNhisFetchRequestHash({
    identityHash: identity.identityHash,
    targets,
    yearLimit: effectiveYearLimit,
    fromDate: requestDefaults.fromDate,
    toDate: requestDefaults.toDate,
    subjectType: requestDefaults.subjectType,
  });
  const shouldUpdateIdentityHash =
    link.lastIdentityHash !== identity.identityHash;
  if (forceRefresh) {
    const forceRefreshCacheGuardSeconds =
      resolveNhisForceRefreshCacheGuardSeconds();
    if (forceRefreshCacheGuardSeconds > 0) {
      const guardedCachedResponse = await tryServeNhisFetchCache({
        appUserId: auth.data.appUserId,
        requestHash: requestHashMeta.requestHash,
        shouldUpdateIdentityHash,
        identityHash: identity.identityHash,
        targets: requestHashMeta.normalizedTargets,
        yearLimit: effectiveYearLimit,
        subjectType: requestDefaults.subjectType,
        maxAgeSeconds: forceRefreshCacheGuardSeconds,
        sourceOverride: "db-force-guard",
        forceRefreshGuarded: true,
      });
      if (guardedCachedResponse) return guardedCachedResponse;
    }
    const cooldown = computeNhisForceRefreshCooldown(
      pickMostRecentDate(link.lastFetchedAt, latestFetchAttemptAt)
    );
    if (!cooldown.available) {
      const retryAfter = cooldown.remainingSeconds;
      return NextResponse.json(
        {
          ok: false,
          error: `Force refresh is limited to one request per ${cooldown.cooldownSeconds} seconds.`,
          errCd: NHIS_FORCE_REFRESH_COOLDOWN_ERR_CODE,
          errMsg: `Retry after ${retryAfter} seconds.`,
          retryAfterSec: retryAfter,
        },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, "Retry-After": String(retryAfter) },
        }
      );
    }
  }
  if (!forceRefresh) {
    const cachedResponse = await tryServeNhisFetchCache({
      appUserId: auth.data.appUserId,
      requestHash: requestHashMeta.requestHash,
      shouldUpdateIdentityHash,
      identityHash: identity.identityHash,
      targets: requestHashMeta.normalizedTargets,
      yearLimit: effectiveYearLimit,
      subjectType: requestDefaults.subjectType,
      allowHistoryFallback: true,
    });
    if (cachedResponse) return cachedResponse;
  }
  const fetchBudget = await evaluateNhisFetchBudget({
    appUserId: auth.data.appUserId,
    forceRefresh,
  });
  if (!fetchBudget.available) {
    const blockedState =
      fetchBudget.reason === "forceRefresh"
        ? fetchBudget.snapshot.forceRefresh
        : fetchBudget.snapshot.fresh;
    const errCd =
      fetchBudget.reason === "forceRefresh"
        ? NHIS_FORCE_REFRESH_DAILY_LIMIT_ERR_CODE
        : NHIS_FETCH_DAILY_LIMIT_ERR_CODE;
    return NextResponse.json(
      {
        ok: false,
        error:
          fetchBudget.reason === "forceRefresh"
            ? "Force refresh budget is exhausted for this window."
            : "Fresh fetch budget is exhausted for this window.",
        errCd,
        errMsg: `Used ${blockedState.used}/${blockedState.limit} in last ${fetchBudget.snapshot.windowHours}h.`,
        retryAfterSec: fetchBudget.retryAfterSec,
        budget: fetchBudget.snapshot,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(fetchBudget.retryAfterSec),
        },
      }
    );
  }
  const basePayload = buildBasePayload({
    linkLoginMethod: link.loginMethod,
    linkLoginOrgCd: link.loginOrgCd,
    linkCookieData: link.cookieData,
    requestDefaults,
  });
  const detailPayload = buildDetailPayload(basePayload);
  const dedupKey = `${auth.data.appUserId}|${requestHashMeta.requestHash}`;
  const freshResult = await runWithNhisFetchDedup(dedupKey, async () => {
    try {
      const executed = await executeNhisFetch({
        targets,
        effectiveYearLimit,
        basePayload,
        detailPayload,
        requestDefaults,
      });
      if (!executed.payload.ok) {
        const failedErrCode =
          typeof executed.firstFailed?.errCd === "string"
            ? executed.firstFailed.errCd.trim().toUpperCase()
            : "";
        const hasSessionExpiredFailure = (executed.payload.failed ?? []).some(
          (failure) =>
            (failure.errCd || "").trim().toUpperCase() ===
            NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE
        );
        const failedStatusCode =
          failedErrCode === NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE ||
          hasSessionExpiredFailure
            ? 401
            : 502;
        await persistNhisFetchResult({
          appUserId: auth.data.appUserId,
          identityHash: identity.identityHash,
          requestHash: requestHashMeta.requestHash,
          requestKey: requestHashMeta.requestKey,
          targets: requestHashMeta.normalizedTargets,
          yearLimit: effectiveYearLimit,
          requestDefaults,
          statusCode: failedStatusCode,
          payload: executed.payload,
          firstFailed: executed.firstFailed,
          updateFetchedAt: false,
        });
        await recordNhisFetchAttemptSafe({
          appUserId: auth.data.appUserId,
          identityHash: identity.identityHash,
          requestHash: requestHashMeta.requestHash,
          requestKey: requestHashMeta.requestKey,
          forceRefresh,
          statusCode: failedStatusCode,
          ok: false,
        });
        return { statusCode: failedStatusCode, payload: executed.payload };
      }
      await persistNhisFetchResult({
        appUserId: auth.data.appUserId,
        identityHash: identity.identityHash,
        requestHash: requestHashMeta.requestHash,
        requestKey: requestHashMeta.requestKey,
        targets: requestHashMeta.normalizedTargets,
        yearLimit: effectiveYearLimit,
        requestDefaults,
        statusCode: 200,
        payload: executed.payload,
        firstFailed: executed.firstFailed,
        updateFetchedAt: true,
      });
      await recordNhisFetchAttemptSafe({
        appUserId: auth.data.appUserId,
        identityHash: identity.identityHash,
        requestHash: requestHashMeta.requestHash,
        requestKey: requestHashMeta.requestKey,
        forceRefresh,
        statusCode: 200,
        ok: true,
      });
      return { statusCode: 200, payload: executed.payload };
    } catch (error) {
      await recordNhisFetchAttemptSafe({
        appUserId: auth.data.appUserId,
        identityHash: identity.identityHash,
        requestHash: requestHashMeta.requestHash,
        requestKey: requestHashMeta.requestKey,
        forceRefresh,
        statusCode: 500,
        ok: false,
      });
      throw error;
    }
  });
  if (!freshResult.payload.ok) {
    return NextResponse.json(freshResult.payload, {
      status: freshResult.statusCode,
      headers: NO_STORE_HEADERS,
    });
  }
  return NextResponse.json(
    { ...freshResult.payload, cached: false, cache: { source: "fresh" } },
    { status: freshResult.statusCode, headers: NO_STORE_HEADERS }
  );
}
