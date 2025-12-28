import { NextResponse } from "next/server";
import { headers } from "next/headers";

type HeaderLike = {
  get(name: string): string | null;
};

function baseUrl(h: HeaderLike, reqUrl: string) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;

  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host");

  if (host) return `${proto}://${host}`;
  return new URL(reqUrl).origin;
}

export async function GET(req: Request) {
  const h = await headers();
  const origin = baseUrl(h, req.url);

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

  return NextResponse.redirect(authUrl);
}
