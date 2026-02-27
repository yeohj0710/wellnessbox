import {
  extractCookieData,
  extractStepData,
  fetchMedicalInfo,
} from "@/lib/server/hyphen/client";
import { toPrismaJson } from "@/lib/server/hyphen/json";
import { upsertNhisLink } from "@/lib/server/hyphen/link";
import { runWithHyphenInFlightDedup } from "@/lib/server/hyphen/inflight-dedup";
import { nhisNoStoreJson } from "@/lib/server/hyphen/nhis-route-responses";
import { buildNhisRequestDefaults } from "@/lib/server/hyphen/request-defaults";
import { clearPendingEasyAuth } from "@/lib/server/hyphen/session";
import {
  recordSignOperationalAttemptSafe,
  SIGN_REINIT_REQUIRED_CODE,
} from "@/lib/server/hyphen/sign-route-helpers";

type PendingEasyAuth = {
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
};

type RequestDefaults = ReturnType<typeof buildNhisRequestDefaults>;

export async function runNhisSignStep(input: {
  appUserId: string;
  identityHash: string;
  pendingEasyAuth: PendingEasyAuth;
  requestDefaults: RequestDefaults;
  stepData: unknown;
  cookieData: unknown;
  otpOrAuthResult: unknown;
}) {
  const signResponse = await runWithHyphenInFlightDedup(
    "nhis-sign",
    `${input.appUserId}|${input.identityHash}|${input.pendingEasyAuth.loginOrgCd}`,
    () =>
      fetchMedicalInfo({
        loginMethod: "EASY",
        loginOrgCd: input.pendingEasyAuth.loginOrgCd,
        resNm: input.pendingEasyAuth.resNm,
        resNo: input.pendingEasyAuth.resNo,
        mobileNo: input.pendingEasyAuth.mobileNo,
        ...input.requestDefaults,
        stepMode: "step",
        step: "sign",
        step_data: input.stepData,
        cookieData: input.cookieData ?? undefined,
        showCookie: "Y",
        ...(input.otpOrAuthResult !== undefined
          ? { otpOrAuthResult: input.otpOrAuthResult }
          : {}),
      })
  );

  return {
    nextStepData: extractStepData(signResponse),
    nextCookieData: extractCookieData(signResponse),
  };
}

export async function persistNhisLinkedSign(input: {
  appUserId: string;
  identityHash: string;
  pendingEasyAuth: PendingEasyAuth;
  linkStepData: unknown;
  linkCookieData: unknown;
  nextStepData: unknown;
  nextCookieData: unknown;
}) {
  await Promise.all([
    upsertNhisLink(input.appUserId, {
      linked: true,
      loginMethod: "EASY",
      loginOrgCd: input.pendingEasyAuth.loginOrgCd,
      stepMode: "step",
      stepData: toPrismaJson(input.nextStepData ?? input.linkStepData),
      cookieData: toPrismaJson(input.nextCookieData ?? input.linkCookieData),
      lastIdentityHash: input.identityHash,
      lastLinkedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
    }),
    clearPendingEasyAuth(),
  ]);
}

export async function tryAutoReinitAfterStaleSign(input: {
  appUserId: string;
  identityHash: string;
  pendingEasyAuth: PendingEasyAuth;
  requestDefaults: RequestDefaults;
}) {
  const reinitResponse = await runWithHyphenInFlightDedup(
    "nhis-init",
    `${input.appUserId}|${input.identityHash}|${input.pendingEasyAuth.loginOrgCd}|sign-reinit`,
    () =>
      fetchMedicalInfo({
        loginMethod: "EASY",
        loginOrgCd: input.pendingEasyAuth.loginOrgCd,
        resNm: input.pendingEasyAuth.resNm,
        resNo: input.pendingEasyAuth.resNo,
        mobileNo: input.pendingEasyAuth.mobileNo,
        ...input.requestDefaults,
        stepMode: "step",
        step: "init",
        showCookie: "Y",
      })
  );

  const nextStepData = extractStepData(reinitResponse);
  const nextCookieData = extractCookieData(reinitResponse);
  if (!nextStepData) return null;

  await upsertNhisLink(input.appUserId, {
    linked: false,
    loginMethod: "EASY",
    loginOrgCd: input.pendingEasyAuth.loginOrgCd,
    stepMode: "step",
    stepData: toPrismaJson(nextStepData),
    cookieData: toPrismaJson(nextCookieData),
    lastIdentityHash: input.identityHash,
    lastErrorCode: null,
    lastErrorMessage: null,
  });
  recordSignOperationalAttemptSafe({
    appUserId: input.appUserId,
    statusCode: 409,
    ok: false,
    reason: "reinitialized",
    identityHash: input.identityHash,
  });
  return nhisNoStoreJson(
    {
      ok: false,
      linked: false,
      nextAction: "sign",
      code: SIGN_REINIT_REQUIRED_CODE,
      reinitialized: true,
      error:
        "인증 세션이 만료되어 인증 요청을 다시 시작했습니다. 카카오톡 인증을 확인한 뒤 다시 시도해 주세요.",
    },
    409
  );
}
