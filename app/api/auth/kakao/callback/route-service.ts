import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { KAKAO_STATE_COOKIE } from "@/lib/auth/kakao/constants";
import { redirectWithKakaoStateCleanup } from "@/lib/auth/kakao/callback-route";
import { runKakaoCallbackRequest } from "@/lib/auth/kakao/callback-handler";
import {
  kakaoRedirectUri,
  publicOrigin,
  resolveRequestOrigin,
} from "@/lib/server/origin";

export async function runKakaoCallbackGetRoute(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  const h = await headers();
  const cookieStore = await cookies();
  const requestOrigin = resolveRequestOrigin(h, request.url);
  const origin = publicOrigin(requestOrigin);
  const redirectUri = kakaoRedirectUri(requestOrigin);
  const secure = origin.startsWith("https://");
  const stateCookie = cookieStore.get(KAKAO_STATE_COOKIE)?.value ?? null;

  try {
    return runKakaoCallbackRequest({
      request,
      code,
      stateParam,
      stateCookie,
      origin,
      redirectUri,
      secure,
    });
  } catch (error) {
    console.error("[kakao callback] unexpected_error", {
      url: request.url,
      requestOrigin,
      origin,
      redirectUri,
      secure,
      hasStateParam: !!stateParam,
      hasStateCookie: !!stateCookie,
    });
    console.error(error);
    return redirectWithKakaoStateCleanup({
      path: "/?login=unexpected_error",
      origin,
      secure,
    });
  }
}
