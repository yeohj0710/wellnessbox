import {
  NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
} from "@/lib/shared/hyphen-fetch";
import {
  NHIS_INIT_REQUIRED_ERR_CODE,
  NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
} from "@/lib/server/hyphen/fetch-route-constants";
import {
  normalizeFailedCodes,
} from "@/lib/server/hyphen/fetch-route-persist";
import type {
  NhisFetchPayload,
} from "@/lib/server/hyphen/fetch-route-types";
import {
  nhisAuthExpiredJson,
  nhisInitRequiredJson,
  nhisNoStoreJson,
} from "@/lib/server/hyphen/nhis-route-responses";

export {
  NHIS_INIT_REQUIRED_ERR_CODE,
  NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
};

export function buildBlockedTargetsResponse(blockedTargets: string[]) {
  return nhisNoStoreJson(
    {
      ok: false,
      error: "현재 비용 정책에서는 요약 대상만 조회할 수 있어요.",
      errCd: NHIS_TARGET_POLICY_BLOCKED_ERR_CODE,
      errMsg: `Blocked targets: ${blockedTargets.join(", ")}`,
      blockedTargets,
    },
    400
  );
}

export function buildInitRequiredFetchResponse() {
  return nhisInitRequiredJson(
    "연동이 완료되지 않았습니다. 카카오톡 인증 요청(init)부터 진행해 주세요."
  );
}

export function buildMissingCookieSessionResponse() {
  return nhisAuthExpiredJson(
    "인증 세션이 만료되어 조회를 진행할 수 없습니다. 인증을 다시 진행해 주세요.",
    {
      errCd: NHIS_LOGIN_SESSION_EXPIRED_ERR_CODE,
      errMsg: "Missing NHIS cookie session.",
    }
  );
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
          "인증 세션이 만료되었거나 인증 요청이 유효하지 않습니다. 카카오톡 인증 요청(init)부터 다시 진행해 주세요.",
      },
      409
    );
  }
  return nhisNoStoreJson(input.payload, input.statusCode);
}
