import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import {
  getLatestNhisFetchCacheByIdentity,
} from "@/lib/server/hyphen/fetch-cache";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import {
  recordInitOperationalAttemptSafe,
  SUMMARY_CACHE_TARGET_SETS,
  SUMMARY_CACHE_YEAR_LIMIT,
} from "@/lib/server/hyphen/init-route-helpers";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { upsertNhisLink } from "@/lib/server/hyphen/link";
import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import {
  getErrorCodeMessage,
  hyphenErrorToResponse,
} from "@/lib/server/hyphen/route-utils";
import { clearPendingEasyAuth, savePendingEasyAuth } from "@/lib/server/hyphen/session";

type RequestDefaults = ReturnType<typeof buildNhisRequestDefaults>;

type PendingEasyAuthLike = {
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
};

export async function resolveReplayableSummaryCache(input: {
  appUserId: string;
  identityHash: string;
  subjectType: string;
}) {
  return (
    (
      await Promise.all(
        SUMMARY_CACHE_TARGET_SETS.map((targets) =>
          getLatestNhisFetchCacheByIdentity({
            appUserId: input.appUserId,
            identityHash: input.identityHash,
            targets: [...targets],
            yearLimit: SUMMARY_CACHE_YEAR_LIMIT,
            subjectType: input.subjectType,
          })
        )
      )
    ).find((item) => item !== null) ?? null
  );
}

export async function reuseInitFromDbHistory(input: {
  appUserId: string;
  loginOrgCd: string;
  identityHash: string;
}) {
  await Promise.all([
    upsertNhisLink(input.appUserId, {
      linked: true,
      loginMethod: "EASY",
      loginOrgCd: input.loginOrgCd,
      lastIdentityHash: input.identityHash,
      lastLinkedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
    }),
    clearPendingEasyAuth(),
  ]);
  recordInitOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 200,
    ok: true,
    reason: "reused_db_history",
    identityHash: input.identityHash,
  });
  return nhisNoStoreJson({
    ok: true,
    nextStep: "fetch",
    linked: true,
    reused: true,
    source: "db-history",
  });
}

export async function reuseInitFromStoredStep(input: {
  appUserId: string;
  loginOrgCd: string;
  identityHash: string;
}) {
  await upsertNhisLink(input.appUserId, {
    linked: false,
    loginMethod: "EASY",
    loginOrgCd: input.loginOrgCd,
    lastIdentityHash: input.identityHash,
    lastErrorCode: null,
    lastErrorMessage: null,
  });
  recordInitOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 200,
    ok: true,
    reason: "reused_step_data",
    identityHash: input.identityHash,
  });
  return nhisNoStoreJson({
    ok: true,
    nextStep: "sign",
    linked: false,
    reused: true,
  });
}

export async function executeNhisInitAndPersist(input: {
  appUserId: string;
  identityHash: string;
  loginOrgCd: string;
  pendingAuth: PendingEasyAuthLike;
  requestDefaults: RequestDefaults;
}) {
  try {
    const initResponse = await runWithHyphenInFlightDedup(
      "nhis-init",
      `${input.appUserId}|${input.identityHash}|${input.loginOrgCd}`,
      () =>
        fetchMedicalInfo({
          loginMethod: "EASY",
          loginOrgCd: input.loginOrgCd,
          resNm: input.pendingAuth.resNm,
          resNo: input.pendingAuth.resNo,
          mobileNo: input.pendingAuth.mobileNo,
          ...input.requestDefaults,
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
      upsertNhisLink(input.appUserId, {
        linked: false,
        loginMethod: "EASY",
        loginOrgCd: input.loginOrgCd,
        stepMode: "step",
        stepData: toPrismaJson(stepData),
        cookieData: toPrismaJson(cookieData),
        lastIdentityHash: input.identityHash,
        lastErrorCode: null,
        lastErrorMessage: null,
      }),
      savePendingEasyAuth({
        loginMethod: "EASY",
        loginOrgCd: input.loginOrgCd,
        resNm: input.pendingAuth.resNm,
        resNo: input.pendingAuth.resNo,
        mobileNo: input.pendingAuth.mobileNo,
      }),
    ]);

    recordInitOperationalAttemptSafe({
      appUserId: input.appUserId,
      statusCode: 200,
      ok: true,
      reason: "init_requested",
      identityHash: input.identityHash,
    });
    return nhisNoStoreJson({ ok: true, nextStep: "sign", linked: false });
  } catch (error) {
    const errorInfo = getErrorCodeMessage(error);
    await upsertNhisLink(input.appUserId, {
      linked: false,
      loginMethod: "EASY",
      loginOrgCd: input.loginOrgCd,
      lastIdentityHash: input.identityHash,
      lastErrorCode: errorInfo.code ?? null,
      lastErrorMessage: errorInfo.message ?? null,
    });
    recordInitOperationalAttemptSafe({
      appUserId: input.appUserId,
      statusCode: 502,
      ok: false,
      reason: errorInfo.code || "init_failed",
      identityHash: input.identityHash,
    });
    return hyphenErrorToResponse(
      error,
      "인증 요청에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요."
    );
  }
}
