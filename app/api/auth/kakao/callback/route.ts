import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ensureClient } from "@/lib/server/client";

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

function resolveOrigin(h: Headers) {
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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

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

    const clientId = String(me.id);
    await ensureClient(clientId);

    const persistedProfile = await db.userProfile.findUnique({
      where: { clientId },
      select: { data: true },
    });

    const currentData = isPlainObject(persistedProfile?.data)
      ? (persistedProfile!.data as Record<string, unknown>)
      : {};

    const storedNickname =
      typeof currentData.nickname === "string" ? currentData.nickname : undefined;
    const storedEmail =
      typeof currentData.email === "string" ? currentData.email : undefined;
    const storedProfileImage =
      typeof currentData.profileImageUrl === "string"
        ? currentData.profileImageUrl
        : undefined;
    const storedKakaoEmail =
      typeof currentData.kakaoEmail === "string" ? currentData.kakaoEmail : undefined;

    const kakaoEmail = kakaoAccount.email ?? storedKakaoEmail;
    const nextNickname = storedNickname || profile.nickname || "";
    const nextEmail = storedEmail ?? kakaoEmail ?? "";
    const nextProfileImage =
      storedProfileImage || profile.profile_image_url || profile.thumbnail_image_url || "";

    const nextData = {
      ...currentData,
      nickname: nextNickname,
      email: nextEmail,
      profileImageUrl: nextProfileImage,
      kakaoEmail: kakaoEmail ?? null,
    } satisfies Record<string, unknown>;

    if (persistedProfile) {
      await db.userProfile.update({
        where: { clientId },
        data: { data: nextData as Prisma.InputJsonValue },
      });
    } else {
      await db.userProfile.create({
        data: {
          clientId,
          data: nextData as Prisma.InputJsonValue,
        },
      });
    }

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
