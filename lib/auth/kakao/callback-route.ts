import { NextResponse } from "next/server";
import { generateFriendlyNickname, normalizeNickname } from "@/lib/nickname";
import { KAKAO_STATE_COOKIE } from "@/lib/auth/kakao/constants";

export type KakaoUserMe = {
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

type ExistingAppUserLike = {
  nickname: string | null;
  email: string | null;
  profileImageUrl: string | null;
  kakaoEmail: string | null;
  clientId: string | null;
};

type ResolveKakaoUserFieldsInput = {
  existingUser: ExistingAppUserLike | null;
  kakaoIdStr: string;
  me: KakaoUserMe;
};

export function clearKakaoStateCookie(response: NextResponse, secure: boolean) {
  response.cookies.set({
    name: KAKAO_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
}

export function redirectWithKakaoStateCleanup(input: {
  path: string;
  origin: string;
  secure: boolean;
}) {
  const response = NextResponse.redirect(new URL(input.path, input.origin), 302);
  clearKakaoStateCookie(response, input.secure);
  return response;
}

export async function exchangeKakaoAccessToken(input: {
  clientId: string;
  redirectUri: string;
  code: string;
}) {
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      code: input.code,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return { ok: false as const, reason: "token_error" as const };
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return { ok: false as const, reason: "missing_token" as const };
  }
  return { ok: true as const, accessToken: tokenJson.access_token };
}

export async function fetchKakaoUserMe(accessToken: string) {
  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!meRes.ok) return null;
  return (await meRes.json()) as KakaoUserMe;
}

export async function resolveKakaoUserFields(input: ResolveKakaoUserFieldsInput) {
  const kakaoAccount = input.me.kakao_account ?? {};
  const profile = kakaoAccount.profile ?? {};
  const normalizedProfileNickname = normalizeNickname(profile.nickname);

  const nextNickname = input.existingUser?.nickname
    ? normalizeNickname(input.existingUser.nickname)
    : normalizedProfileNickname && normalizedProfileNickname !== "없음"
    ? normalizedProfileNickname
    : await generateFriendlyNickname(input.kakaoIdStr);

  const nextEmail = input.existingUser?.email ?? kakaoAccount.email ?? "";
  const nextProfileImage =
    input.existingUser?.profileImageUrl ||
    profile.profile_image_url ||
    profile.thumbnail_image_url ||
    "";

  const kakaoEmail =
    input.existingUser?.kakaoEmail ?? kakaoAccount.email ?? undefined;

  return {
    nextNickname,
    nextEmail,
    nextProfileImage,
    kakaoEmail,
  };
}
