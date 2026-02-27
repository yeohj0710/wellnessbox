import "server-only";

import type { NextRequest } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { createAppTransferToken } from "@/lib/auth/kakao/appBridge";
import {
  exchangeKakaoAccessToken,
  fetchKakaoUserMe,
  resolveKakaoUserFields,
} from "@/lib/auth/kakao/callback-route";
import { ensureClient, resolveOrCreateClientId } from "@/lib/server/client";
import { attachClientToAppUser } from "@/lib/server/client-link";

type KakaoCallbackPlatform = "app" | "web";

type KakaoCallbackFailureReason = "missing_token" | "token_error" | "profile_error";

type KakaoCallbackFlowFailure = {
  ok: false;
  reason: KakaoCallbackFailureReason;
};

type KakaoCallbackFlowSuccess = {
  ok: true;
  redirectTo: string;
  attachResult: Awaited<ReturnType<typeof attachClientToAppUser>>;
};

export type KakaoCallbackFlowResult =
  | KakaoCallbackFlowFailure
  | KakaoCallbackFlowSuccess;

export async function runKakaoCallbackFlow(input: {
  request: NextRequest;
  code: string;
  clientId: string;
  redirectUri: string;
  origin: string;
  platform: KakaoCallbackPlatform;
}): Promise<KakaoCallbackFlowResult> {
  const tokenResult = await exchangeKakaoAccessToken({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    code: input.code,
  });
  if (!tokenResult.ok) {
    return {
      ok: false,
      reason: tokenResult.reason,
    };
  }

  const me = await fetchKakaoUserMe(tokenResult.accessToken);
  if (!me) {
    return {
      ok: false,
      reason: "profile_error",
    };
  }

  const kakaoIdStr = String(me.id);
  const existingUser = await db.appUser.findUnique({
    where: { kakaoId: kakaoIdStr },
  });

  const { nextNickname, nextEmail, nextProfileImage, kakaoEmail } =
    await resolveKakaoUserFields({
      existingUser,
      kakaoIdStr,
      me,
    });

  const appClientId = existingUser?.clientId ?? resolveOrCreateClientId(null);
  if (!existingUser?.clientId) {
    await ensureClient(appClientId, {
      userAgent: input.request.headers.get("user-agent"),
    });
  }

  await db.appUser.upsert({
    where: { kakaoId: kakaoIdStr },
    create: {
      kakaoId: kakaoIdStr,
      clientId: appClientId,
      nickname: nextNickname || null,
      email: nextEmail || null,
      profileImageUrl: nextProfileImage || null,
      kakaoEmail: kakaoEmail || null,
    },
    update: {
      clientId: appClientId,
      nickname: nextNickname || null,
      email: nextEmail || null,
      profileImageUrl: nextProfileImage || null,
      kakaoEmail: kakaoEmail || null,
    },
  });

  const attachResult = await attachClientToAppUser({
    req: input.request,
    kakaoId: kakaoIdStr,
    source: "kakao-login",
    allowMerge: true,
    userAgent: input.request.headers.get("user-agent"),
  });

  const session = await getSession();
  session.user = {
    kakaoId: me.id,
    loggedIn: true,
    nickname: nextNickname || undefined,
    profileImageUrl: nextProfileImage || undefined,
    email: nextEmail || undefined,
    kakaoEmail: kakaoEmail || undefined,
  };
  await session.save();

  let redirectTo = new URL("/", input.origin).toString();
  if (input.platform === "app") {
    const transfer = await createAppTransferToken({
      kakaoId: me.id,
      nickname: nextNickname || null,
      profileImageUrl: nextProfileImage || null,
      email: nextEmail || null,
      kakaoEmail: kakaoEmail || null,
      clientId: appClientId,
    });
    redirectTo = transfer.deepLink;
  }

  return {
    ok: true,
    redirectTo,
    attachResult,
  };
}
