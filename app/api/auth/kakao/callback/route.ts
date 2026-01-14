import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { ensureClient, resolveOrCreateClientId } from "@/lib/server/client";
import { generateFriendlyNickname, normalizeNickname } from "@/lib/nickname";
import { KAKAO_STATE_COOKIE } from "@/lib/auth/kakao/constants";
import { createAppTransferToken } from "@/lib/auth/kakao/appBridge";
import { verifyLoginState } from "@/lib/auth/kakao/state";
import { attachClientToAppUser } from "@/lib/server/client-link";
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
  const secure = origin.startsWith("https://");

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set({
      name: KAKAO_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  };

  const redirectWithStateCleanup = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 302);
    clearStateCookie(response);
    return response;
  };

  const stateCookie = cookieStore.get(KAKAO_STATE_COOKIE)?.value ?? null;
  const state = verifyLoginState(stateParam, stateCookie);

  if (!code) {
    return redirectWithStateCleanup("/?login=missing_code");
  }

  if (!state) {
    return redirectWithStateCleanup("/?login=invalid_state");
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return redirectWithStateCleanup("/?login=missing_client_id");
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
      return redirectWithStateCleanup("/?login=token_error");
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return redirectWithStateCleanup("/?login=missing_token");
    }

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return redirectWithStateCleanup("/?login=profile_error");
    }

    const me = (await meRes.json()) as KakaoUserMe;

    const kakaoAccount = me.kakao_account ?? {};
    const profile = kakaoAccount.profile ?? {};

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

    const appClientId = existingUser?.clientId ?? resolveOrCreateClientId(null);

    if (!existingUser?.clientId) {
      await ensureClient(appClientId, {
        userAgent: request.headers.get("user-agent"),
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
      req: request,
      kakaoId: kakaoIdStr,
      source: "kakao-login",
      allowMerge: true,
      userAgent: request.headers.get("user-agent"),
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

    let redirectTo: string = new URL("/", origin).toString();

    if (state.platform === "app") {
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

    const response = NextResponse.redirect(redirectTo, 302);

    clearStateCookie(response);
    if (attachResult.cookieToSet) {
      response.cookies.set(
        attachResult.cookieToSet.name,
        attachResult.cookieToSet.value,
        attachResult.cookieToSet.options
      );
    }

    return response;
  } catch (e) {
    console.error("[kakao callback] unexpected_error", {
      url: request.url,
      requestOrigin,
      origin,
      redirectUri,
      secure,
      hasStateParam: !!stateParam,
      hasStateCookie: !!stateCookie,
    });
    console.error(e);

    return redirectWithStateCleanup("/?login=unexpected_error");
  }
}
