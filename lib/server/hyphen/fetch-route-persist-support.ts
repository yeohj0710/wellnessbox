import { enrichNhisPayloadWithAiSummary } from "@/lib/server/hyphen/fetch-ai-summary";
import { recordNhisFetchAttempt } from "@/lib/server/hyphen/fetch-attempt";
import {
  NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
} from "@/lib/server/hyphen/fetch-route-constants";
import { logHyphenError } from "@/lib/server/hyphen/route-utils";
import type {
  NhisFetchFirstFailed,
  NhisFetchPayload,
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

export async function enrichNhisPayloadWithAiSummarySafe(
  payload: NhisFetchPayload
) {
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

export function normalizeFailedCodes(payload: NhisFetchPayload) {
  return (payload.failed ?? [])
    .map((item) => normalizeFailureCode(item.errCd))
    .filter((code) => code.length > 0);
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
