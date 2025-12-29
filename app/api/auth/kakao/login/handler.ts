import "server-only";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { CLIENT_COOKIE_NAME } from "@/lib/shared/client-id";
import { kakaoRedirectUri, resolveRequestOrigin } from "@/lib/server/origin";
import { KAKAO_CONTEXT_COOKIE, KAKAO_STATE_COOKIE } from "@/lib/auth/kakao/constants";
import { createLoginState, Platform } from "@/lib/auth/kakao/state";

function resolvePlatform(userAgent: string, hinted: boolean, override?: Platform) {
  if (override) return override;
  if (hinted) return "app";
  if (userAgent.includes("wv") || userAgent.includes("capacitor")) return "app";
  return "web";
}

export async function handleKakaoLogin(req: Request, platformOverride?: Platform) {
  const h = await headers();
  const cookieStore = await cookies();
  const origin = resolveRequestOrigin(h, req.url);
  const redirectUri = kakaoRedirectUri(origin);
  const clientId = process.env.KAKAO_REST_API_KEY;

  if (!clientId) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY not configured" },
      { status: 500 }
    );
  }

  const userAgent = h.get("user-agent")?.toLowerCase() ?? "";
  const clientIdFromCookie = cookieStore.get(CLIENT_COOKIE_NAME)?.value ?? null;
  const hintedPlatform = cookieStore.get(KAKAO_CONTEXT_COOKIE)?.value === "app";
  const platform = resolvePlatform(userAgent, hintedPlatform, platformOverride);

  const { token: state, nonce } = createLoginState(platform, clientIdFromCookie);

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(KAKAO_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: origin.startsWith("https://"),
    maxAge: 10 * 60,
  });

  return response;
}
