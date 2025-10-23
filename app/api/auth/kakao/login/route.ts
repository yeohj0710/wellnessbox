import { NextResponse } from "next/server";
import { headers } from "next/headers";

function baseUrl(h: Headers) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

export async function GET() {
  const h = await headers();
  const origin = baseUrl(h);
  const redirectUri = `${origin}/api/auth/kakao/callback`;
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY not configured" },
      { status: 500 }
    );
  }
  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  return NextResponse.redirect(authUrl.toString());
}
