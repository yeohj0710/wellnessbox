import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";

type KakaoUserMe = { id: number };

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
  if (!code) return NextResponse.redirect("/?login=missing_code");

  const h = await headers();
  const origin = baseUrl(h);
  const redirectUri = `${origin}/api/auth/kakao/callback`;

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) return NextResponse.redirect("/?login=missing_client_id");

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
    });
    if (!tokenRes.ok) return NextResponse.redirect("/?login=token_error");
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return NextResponse.redirect("/?login=missing_token");

    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!meRes.ok) return NextResponse.redirect("/?login=profile_error");
    const me = (await meRes.json()) as KakaoUserMe;

    const session = await getSession();
    session.user = { kakaoId: me.id, loggedIn: true };
    await session.save();

    return NextResponse.redirect("/");
  } catch {
    return NextResponse.redirect("/?login=unexpected_error");
  }
}
