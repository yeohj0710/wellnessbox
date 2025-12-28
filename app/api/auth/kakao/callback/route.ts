import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { ensureClient, getClientIdFromRequest } from "@/lib/server/client";
import { generateFriendlyNickname, normalizeNickname } from "@/lib/nickname";

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

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

type HeadersLike = { get(name: string): string | null };

function resolveOrigin(h: HeadersLike) {
  const proto = h.get("x-forwarded-proto") || "http";
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

function canonicalizeHost(origin: string) {
  const u = new URL(origin);
  const host = u.host.replace(/^www\./, "");
  return `${u.protocol}//${host}`;
}

function resolveRedirectUri(origin: string) {
  const base = canonicalizeHost(origin);

  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return "http://localhost:3000/api/auth/kakao/callback";
  }

  if (base.includes("wellnessbox.me")) {
    return "https://wellnessbox.me/api/auth/kakao/callback";
  }

  return `${normalizeBaseUrl(base)}/api/auth/kakao/callback`;
}

function resolvePublicOrigin(origin: string) {
  const base = canonicalizeHost(origin);

  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return "http://localhost:3000";
  }

  if (base.includes("wellnessbox.me")) {
    return "https://wellnessbox.me";
  }

  return normalizeBaseUrl(base);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const h = await headers();
  const requestOrigin = resolveOrigin(h);
  const origin = resolvePublicOrigin(requestOrigin);
  const redirectUri = resolveRedirectUri(requestOrigin);

  if (!code) {
    return NextResponse.redirect(new URL("/?login=missing_code", origin));
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

    const requestClientId = (await getClientIdFromRequest()) ?? undefined;
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
    const kakaoEmail = existingUser?.kakaoEmail ?? kakaoAccount.email ?? undefined;

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

    return NextResponse.redirect(new URL("/", origin));
  } catch {
    return NextResponse.redirect(new URL("/?login=unexpected_error", origin));
  }
}
