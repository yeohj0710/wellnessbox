import "server-only";

import { normalizeHyphenEasyLoginOrg } from "@/lib/shared/hyphen-login";
import { requireNhisSession } from "@/lib/server/route-auth";
import {
  badInitRequest,
  canReuseStoredInitStep,
  initSchema,
  resolveInitExecutionContext,
} from "@/lib/server/hyphen/init-route-helpers";
import {
  executeNhisInitAndPersist,
  resolveReplayableSummaryCache,
  reuseInitFromDbHistory,
  reuseInitFromStoredStep,
} from "@/lib/server/hyphen/init-route-executor";

type InitIdentityInput = {
  loginOrgCd: string;
  resNm: string;
  resNo: string;
  mobileNo: string;
};

export async function runNhisInitRoute(req: Request, appUserId: string) {
  const raw = await req.json().catch(() => null);
  if (!raw) return badInitRequest("요청 본문(JSON) 형식을 확인해 주세요.");

  const parsed = initSchema.safeParse(raw);
  if (!parsed.success) {
    return badInitRequest(parsed.error.issues[0]?.message || "입력값을 확인해 주세요.");
  }

  const input = parsed.data;
  const forceInit = input.forceInit === true;
  const loginOrgCd = normalizeHyphenEasyLoginOrg(input.loginOrgCd);
  if (!loginOrgCd) return badInitRequest("loginOrgCd는 kakao만 지원합니다.");
  if (loginOrgCd !== "kakao") {
    return badInitRequest(
      "현재 환경에서는 loginOrgCd로 kakao만 지원합니다."
    );
  }

  const identityInput: InitIdentityInput = {
    loginOrgCd,
    resNm: input.resNm,
    resNo: input.resNo,
    mobileNo: input.mobileNo,
  };
  const {
    existingLink,
    pendingEasyAuth,
    pendingReusable,
    identity,
    requestDefaults,
  } = await resolveInitExecutionContext({
    appUserId,
    identityInput,
  });

  const replayableSummaryCache = await resolveReplayableSummaryCache({
    appUserId,
    identityHash: identity.identityHash,
    subjectType: requestDefaults.subjectType,
  });

  if (!forceInit && replayableSummaryCache) {
    return reuseInitFromDbHistory({
      appUserId,
      loginOrgCd,
      identityHash: identity.identityHash,
    });
  }

  if (
    canReuseStoredInitStep({
      forceInit,
      existingLink,
      pendingEasyAuth,
      pendingReusable,
      identityHash: identity.identityHash,
      identityInput,
    })
  ) {
    return reuseInitFromStoredStep({
      appUserId,
      loginOrgCd,
      identityHash: identity.identityHash,
    });
  }

  return executeNhisInitAndPersist({
    appUserId,
    identityHash: identity.identityHash,
    loginOrgCd,
    pendingAuth: identityInput,
    requestDefaults,
  });
}

export async function runNhisInitPostRoute(req: Request) {
  const auth = await requireNhisSession();
  if (!auth.ok) return auth.response;
  return runNhisInitRoute(req, auth.data.appUserId);
}
