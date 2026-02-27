import { z } from "zod";
import {
  NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import type { HyphenNhisRequestPayload } from "@/lib/server/hyphen/client";
import { enrichNhisPayloadWithAiSummary } from "@/lib/server/hyphen/fetch-ai-summary";
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
  NHIS_FETCH_TARGETS,
  type NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  buildFetchBudgetBlockedResponse,
  tryServeFetchGateCache,
} from "@/lib/server/hyphen/fetch-route-gate";
import { persistNhisFetchResult } from "@/lib/server/hyphen/fetch-route-cache";
import { dedupeNhisFetchTargets } from "@/lib/server/hyphen/fetch-request-policy";
import { getNhisLink } from "@/lib/server/hyphen/link";
import {
  nhisAuthExpiredJson,
  nhisInitRequiredJson,
  nhisNoStoreJson,
} from "@/lib/server/hyphen/nhis-route-responses";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { logHyphenError } from "@/lib/server/hyphen/route-utils";
import { resolveBlockedNhisFetchTargets } from "@/lib/server/hyphen/target-policy";

export const NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE = "LOGIN-999";
export const NHIS_INIT_REQUIRED_ERR_CODE = "C0012-001";

const targetEnum = z.enum(NHIS_FETCH_TARGETS);

export const fetchSchema = z
  .object({
    targets: z.array(targetEnum).min(1).optional(),
    yearLimit: z.number().int().min(1).max(5).optional(),
    forceRefresh: z.boolean().optional(),
  })
  .optional();

type NhisFetchPayload = Awaited<ReturnType<typeof executeNhisFetch>>["payload"];
type NhisFetchFirstFailed = Awaited<
  ReturnType<typeof executeNhisFetch>
>["firstFailed"];

type RequestHashMeta = {
  requestHash: string;
  requestKey: string;
  normalizedTargets: string[];
};

type ResolveFetchExecutionInput = {
  appUserId: string;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  forceRefresh: boolean;
};

type ResolveFetchExecutionContext = {
  appUserId: string;
  identityHash: string;
  requestHashMeta: RequestHashMeta;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  forceRefresh: boolean;
  basePayload: HyphenNhisRequestPayload;
  detailPayload: HyphenNhisRequestPayload;
};

export function dedupeTargets(input?: NhisFetchTarget[]) {
  return dedupeNhisFetchTargets(input);
}

export function buildBasePayload(options: {
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

export function buildDetailPayload(
  basePayload: HyphenNhisRequestPayload
): HyphenNhisRequestPayload {
  return { ...basePayload, detailYn: "Y" as const, imgYn: "N" as const };
}

export async function resolveFetchExecutionContext(
  input: ResolveFetchExecutionInput
): Promise<
  | { ready: false; response: Response }
  | { ready: true; context: ResolveFetchExecutionContext }
> {
  const blockedTargets = resolveBlockedNhisFetchTargets(input.targets);
  if (blockedTargets.length > 0) {
    return {
      ready: false,
      response: nhisNoStoreJson(
        {
          ok: false,
          error: "현재 비용 정책에서는 요약 대상만 조회할 수 있어요.",
          errCd: NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
          errMsg: `Blocked targets: ${blockedTargets.join(", ")}`,
          blockedTargets,
        },
        400
      ),
    };
  }

  const [link, latestFetchAttemptAt] = await Promise.all([
    getNhisLink(input.appUserId),
    input.forceRefresh
      ? getLatestNhisFetchAttemptAt(input.appUserId)
      : Promise.resolve(null),
  ]);
  const requestDefaults = buildNhisRequestDefaults();

  if (!link?.linked) {
    return {
      ready: false,
      response: nhisInitRequiredJson(
        "연동이 완료되지 않았습니다. 카카오 인증 요청(init)부터 진행해 주세요."
      ),
    };
  }

  const identity = resolveNhisIdentityHash({
    appUserId: input.appUserId,
    loginOrgCd: link.loginOrgCd,
    storedIdentityHash: link.lastIdentityHash,
  });
  const requestHashMeta = buildNhisFetchRequestHash({
    identityHash: identity.identityHash,
    targets: input.targets,
    yearLimit: input.effectiveYearLimit,
    fromDate: requestDefaults.fromDate,
    toDate: requestDefaults.toDate,
    subjectType: requestDefaults.subjectType,
  });
  const shouldUpdateIdentityHash = link.lastIdentityHash !== identity.identityHash;

  const gateCacheResponse = await tryServeFetchGateCache({
    forceRefresh: input.forceRefresh,
    appUserId: input.appUserId,
    requestHashMeta,
    shouldUpdateIdentityHash,
    identityHash: identity.identityHash,
    yearLimit: input.effectiveYearLimit,
    subjectType: requestDefaults.subjectType,
    lastFetchedAt: link.lastFetchedAt,
    latestFetchAttemptAt,
  });
  if (gateCacheResponse) {
    return {
      ready: false,
      response: gateCacheResponse,
    };
  }

  if (!link.cookieData) {
    return {
      ready: false,
      response: nhisAuthExpiredJson(
        "인증 세션이 만료되어 조회를 진행할 수 없습니다. 인증을 다시 진행해 주세요.",
        {
          errCd: NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
          errMsg: "Missing NHIS cookie session.",
        }
      ),
    };
  }

  const fetchBudget = await evaluateNhisFetchBudget({
    appUserId: input.appUserId,
    forceRefresh: input.forceRefresh,
  });
  if (!fetchBudget.available) {
    return {
      ready: false,
      response: buildFetchBudgetBlockedResponse(fetchBudget),
    };
  }

  const basePayload = buildBasePayload({
    linkLoginMethod: link.loginMethod,
    linkLoginOrgCd: link.loginOrgCd,
    linkCookieData: link.cookieData,
    requestDefaults,
  });
  const detailPayload = buildDetailPayload(basePayload);

  return {
    ready: true,
    context: {
      appUserId: input.appUserId,
      identityHash: identity.identityHash,
      requestHashMeta,
      targets: input.targets,
      effectiveYearLimit: input.effectiveYearLimit,
      requestDefaults,
      forceRefresh: input.forceRefresh,
      basePayload,
      detailPayload,
    },
  };
}

export async function recordNhisFetchAttemptSafe(input: {
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

export async function enrichNhisPayloadWithAiSummarySafe(payload: NhisFetchPayload) {
  if (!payload.ok) return payload;
  try {
    return await enrichNhisPayloadWithAiSummary(payload);
  } catch (error) {
    logHyphenError("[hyphen][fetch] ai summary enrichment failed", error);
    return payload;
  }
}

function normalizeFailureCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export function resolveNhisFetchFailedStatusCode(input: {
  firstFailed: NhisFetchFirstFailed;
  payload: NhisFetchPayload;
}) {
  const failedErrCode =
    typeof input.firstFailed?.errCd === "string"
      ? normalizeFailureCode(input.firstFailed.errCd)
      : "";
  const hasSessionExpiredFailure = (input.payload.failed ?? []).some(
    (failure) =>
      normalizeFailureCode(failure.errCd) === NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE
  );
  if (
    failedErrCode === NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE ||
    hasSessionExpiredFailure
  ) {
    return 401;
  }
  return 502;
}

export function normalizeFailedCodes(payload: NhisFetchPayload) {
  return (payload.failed ?? [])
    .map((item) => normalizeFailureCode(item.errCd))
    .filter((code) => code.length > 0);
}

export function resolveFailedNhisFetchResponse(input: {
  payload: NhisFetchPayload;
  statusCode: number;
}) {
  const failedCodes = normalizeFailedCodes(input.payload);
  if (
    failedCodes.includes(NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE) ||
    failedCodes.includes(NHIS_INIT_REQUIRED_ERR_CODE)
  ) {
    return nhisNoStoreJson(
      {
        ...input.payload,
        code: "NHIS_AUTH_EXPIRED",
        reason: "nhis_auth_expired",
        nextAction: "init",
        error:
          "인증 세션이 만료됐거나 인증 요청이 유효하지 않습니다. 카카오 인증 요청(init)부터 다시 진행해 주세요.",
      },
      409
    );
  }
  return nhisNoStoreJson(input.payload, input.statusCode);
}

export async function executeAndPersistNhisFetch(input: {
  appUserId: string;
  identityHash: string;
  requestHashMeta: RequestHashMeta;
  targets: NhisFetchTarget[];
  effectiveYearLimit: number;
  basePayload: HyphenNhisRequestPayload;
  detailPayload: HyphenNhisRequestPayload;
  requestDefaults: ReturnType<typeof buildNhisRequestDefaults>;
  forceRefresh: boolean;
}) {
  const dedupKey = `${input.appUserId}|${input.requestHashMeta.requestHash}`;
  return runWithNhisFetchDedup(dedupKey, async () => {
    try {
      const executed = await executeNhisFetch({
        targets: input.targets,
        effectiveYearLimit: input.effectiveYearLimit,
        basePayload: input.basePayload,
        detailPayload: input.detailPayload,
        requestDefaults: input.requestDefaults,
      });
      const payloadWithAiSummary = await enrichNhisPayloadWithAiSummarySafe(
        executed.payload
      );
      if (!payloadWithAiSummary.ok) {
        const failedStatusCode = resolveNhisFetchFailedStatusCode({
          firstFailed: executed.firstFailed,
          payload: payloadWithAiSummary,
        });
        await persistNhisFetchResult({
          appUserId: input.appUserId,
          identityHash: input.identityHash,
          requestHash: input.requestHashMeta.requestHash,
          requestKey: input.requestHashMeta.requestKey,
          targets: input.requestHashMeta.normalizedTargets,
          yearLimit: input.effectiveYearLimit,
          requestDefaults: input.requestDefaults,
          statusCode: failedStatusCode,
          payload: payloadWithAiSummary,
          firstFailed: executed.firstFailed,
          updateFetchedAt: false,
        });
        await recordNhisFetchAttemptSafe({
          appUserId: input.appUserId,
          identityHash: input.identityHash,
          requestHash: input.requestHashMeta.requestHash,
          requestKey: input.requestHashMeta.requestKey,
          forceRefresh: input.forceRefresh,
          statusCode: failedStatusCode,
          ok: false,
        });
        return { statusCode: failedStatusCode, payload: payloadWithAiSummary };
      }

      await persistNhisFetchResult({
        appUserId: input.appUserId,
        identityHash: input.identityHash,
        requestHash: input.requestHashMeta.requestHash,
        requestKey: input.requestHashMeta.requestKey,
        targets: input.requestHashMeta.normalizedTargets,
        yearLimit: input.effectiveYearLimit,
        requestDefaults: input.requestDefaults,
        statusCode: 200,
        payload: payloadWithAiSummary,
        firstFailed: executed.firstFailed,
        updateFetchedAt: true,
      });
      await recordNhisFetchAttemptSafe({
        appUserId: input.appUserId,
        identityHash: input.identityHash,
        requestHash: input.requestHashMeta.requestHash,
        requestKey: input.requestHashMeta.requestKey,
        forceRefresh: input.forceRefresh,
        statusCode: 200,
        ok: true,
      });
      return { statusCode: 200, payload: payloadWithAiSummary };
    } catch (error) {
      await recordNhisFetchAttemptSafe({
        appUserId: input.appUserId,
        identityHash: input.identityHash,
        requestHash: input.requestHashMeta.requestHash,
        requestKey: input.requestHashMeta.requestKey,
        forceRefresh: input.forceRefresh,
        statusCode: 500,
        ok: false,
      });
      throw error;
    }
  });
}
