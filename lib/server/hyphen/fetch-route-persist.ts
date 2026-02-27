import { enrichNhisPayloadWithAiSummary } from "@/lib/server/hyphen/fetch-ai-summary";
import { recordNhisFetchAttempt } from "@/lib/server/hyphen/fetch-attempt";
import { runWithNhisFetchDedup } from "@/lib/server/hyphen/fetch-cache";
import { executeNhisFetch } from "@/lib/server/hyphen/fetch-executor";
import {
  NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
} from "@/lib/server/hyphen/fetch-route-constants";
import { persistNhisFetchResult } from "@/lib/server/hyphen/fetch-route-cache";
import { logHyphenError } from "@/lib/server/hyphen/route-utils";
import type {
  ExecuteAndPersistNhisFetchResult,
  NhisFetchFirstFailed,
  NhisFetchPayload,
  ResolveFetchExecutionContext,
} from "@/lib/server/hyphen/fetch-route-types";

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

async function persistFailedNhisFetch(input: {
  context: ResolveFetchExecutionContext;
  firstFailed: NhisFetchFirstFailed;
  payload: NhisFetchPayload;
  statusCode: number;
}) {
  await persistNhisFetchResult({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    targets: input.context.requestHashMeta.normalizedTargets,
    yearLimit: input.context.effectiveYearLimit,
    requestDefaults: input.context.requestDefaults,
    statusCode: input.statusCode,
    payload: input.payload,
    firstFailed: input.firstFailed,
    updateFetchedAt: false,
  });
  await recordNhisFetchAttemptSafe({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    forceRefresh: input.context.forceRefresh,
    statusCode: input.statusCode,
    ok: false,
  });
}

async function persistSuccessfulNhisFetch(input: {
  context: ResolveFetchExecutionContext;
  firstFailed: NhisFetchFirstFailed;
  payload: NhisFetchPayload;
}) {
  await persistNhisFetchResult({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    targets: input.context.requestHashMeta.normalizedTargets,
    yearLimit: input.context.effectiveYearLimit,
    requestDefaults: input.context.requestDefaults,
    statusCode: 200,
    payload: input.payload,
    firstFailed: input.firstFailed,
    updateFetchedAt: true,
  });
  await recordNhisFetchAttemptSafe({
    appUserId: input.context.appUserId,
    identityHash: input.context.identityHash,
    requestHash: input.context.requestHashMeta.requestHash,
    requestKey: input.context.requestHashMeta.requestKey,
    forceRefresh: input.context.forceRefresh,
    statusCode: 200,
    ok: true,
  });
}

export async function executeAndPersistNhisFetch(
  input: ResolveFetchExecutionContext
): Promise<ExecuteAndPersistNhisFetchResult> {
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
        await persistFailedNhisFetch({
          context: input,
          firstFailed: executed.firstFailed,
          payload: payloadWithAiSummary,
          statusCode: failedStatusCode,
        });
        return { statusCode: failedStatusCode, payload: payloadWithAiSummary };
      }

      await persistSuccessfulNhisFetch({
        context: input,
        firstFailed: executed.firstFailed,
        payload: payloadWithAiSummary,
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
