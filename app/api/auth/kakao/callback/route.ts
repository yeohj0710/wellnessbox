import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";

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

function baseUrl(h: Headers) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const h = await headers();
  const origin = baseUrl(h);

  if (!code) {
    return NextResponse.redirect(new URL("/?login=missing_code", origin));
  }

  const redirectUri = `${origin}/api/auth/kakao/callback`;

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
    console.log("KAKAO_ME", JSON.stringify(me));

    const kakaoAccount = me.kakao_account ?? {};
    const profile = kakaoAccount.profile ?? {};

    const session = await getSession();
    session.user = {
      kakaoId: me.id,
      loggedIn: true,
      nickname: profile.nickname,
      profileImageUrl: profile.profile_image_url || profile.thumbnail_image_url,
      email: kakaoAccount.email,
    };
    await session.save();

    return NextResponse.redirect(new URL("/", origin));
  } catch {
    return NextResponse.redirect(new URL("/?login=unexpected_error", origin));
  }
}
