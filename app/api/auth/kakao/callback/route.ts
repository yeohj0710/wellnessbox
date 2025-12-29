import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { ensureClient, getClientIdFromRequest } from "@/lib/server/client";
import { generateFriendlyNickname, normalizeNickname } from "@/lib/nickname";
import {
  attachClientToAppUser,
  withClientCookie,
} from "@/lib/server/client-link";
import { KAKAO_STATE_COOKIE } from "@/lib/auth/kakao/constants";
import { createAppTransferToken } from "@/lib/auth/kakao/appBridge";
import { verifyLoginState } from "@/lib/auth/kakao/state";
import {
  kakaoRedirectUri,
  publicOrigin,
  resolveRequestOrigin,
} from "@/lib/server/origin";

type KakaoUserMe = {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
};

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  const h = await headers();
  const cookieStore = await cookies();
  const requestOrigin = resolveRequestOrigin(h, request.url);
  const origin = publicOrigin(requestOrigin);
  const redirectUri = kakaoRedirectUri(requestOrigin);

  const stateCookie = cookieStore.get(KAKAO_STATE_COOKIE)?.value ?? null;
  const state = verifyLoginState(stateParam, stateCookie);

  if (!code) {
    return NextResponse.redirect(new URL("/?login=missing_code", origin));
  }

  if (!state) {
    return NextResponse.redirect(new URL("/?login=invalid_state", origin));
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.redirect(new URL("/?login=missing_client_id", origin));
  }

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/?login=token_error", origin));
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/?login=missing_token", origin));
    }

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return NextResponse.redirect(new URL("/?login=profile_error", origin));
    }

    const me = (await meRes.json()) as KakaoUserMe;

    const kakaoAccount = me.kakao_account ?? {};
    const profile = kakaoAccount.profile ?? {};

    const requestClientId =
      state.clientId ?? (await getClientIdFromRequest()) ?? undefined;
    if (requestClientId) {
      await ensureClient(requestClientId);
    }

    const kakaoIdStr = String(me.id);
    const existingUser = await db.appUser.findUnique({
      where: { kakaoId: kakaoIdStr },
    });

    const normalizedProfileNickname = normalizeNickname(profile.nickname);
    const nextNickname = existingUser?.nickname
      ? normalizeNickname(existingUser.nickname)
      : normalizedProfileNickname && normalizedProfileNickname !== "없음"
      ? normalizedProfileNickname
      : await generateFriendlyNickname(kakaoIdStr);

    const nextEmail = existingUser?.email ?? kakaoAccount.email ?? "";
    const nextProfileImage =
      existingUser?.profileImageUrl ||
      profile.profile_image_url ||
      profile.thumbnail_image_url ||
      "";

    const kakaoEmail =
      existingUser?.kakaoEmail ?? kakaoAccount.email ?? undefined;

    await db.appUser.upsert({
      where: { kakaoId: kakaoIdStr },
      create: {
        kakaoId: kakaoIdStr,
        clientId: requestClientId ?? existingUser?.clientId,
        nickname: nextNickname || null,
        email: nextEmail || null,
        profileImageUrl: nextProfileImage || null,
        kakaoEmail: kakaoEmail || null,
      },
      update: {
        clientId: requestClientId ?? existingUser?.clientId,
        nickname: nextNickname || null,
        email: nextEmail || null,
        profileImageUrl: nextProfileImage || null,
        kakaoEmail: kakaoEmail || null,
      },
    });

    const attachResult = await attachClientToAppUser({
      req: request,
      kakaoId: kakaoIdStr,
      source: "kakao-login",
      candidateClientId: requestClientId ?? existingUser?.clientId ?? null,
      userAgent: request.headers.get("user-agent"),
      allowMerge: true,
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

    const response = NextResponse.redirect(new URL("/", origin));

    if (attachResult.cookieToSet) {
      withClientCookie(response, attachResult.cookieToSet);
    }

    response.cookies.delete({ name: KAKAO_STATE_COOKIE, path: "/" });

    if (state.platform === "app") {
      const transfer = await createAppTransferToken({
        kakaoId: me.id,
        nickname: nextNickname || null,
        profileImageUrl: nextProfileImage || null,
        email: nextEmail || null,
        kakaoEmail: kakaoEmail || null,
        clientId: attachResult.clientId ?? requestClientId ?? null,
      });

      response.headers.set("Location", transfer.deepLink);
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL("/?login=unexpected_error", origin));
  }
}
