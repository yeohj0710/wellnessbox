import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  clearKakaoStateCookie,
  redirectWithKakaoStateCleanup,
} from "@/lib/auth/kakao/callback-route";
import { runKakaoCallbackFlow } from "@/lib/auth/kakao/callback-flow";
import { verifyLoginState } from "@/lib/auth/kakao/state";

function resolveKakaoFlowFailurePath(
  reason: "missing_token" | "token_error" | "profile_error"
) {
  if (reason === "missing_token") return "/?login=missing_token";
  if (reason === "profile_error") return "/?login=profile_error";
  return "/?login=token_error";
}

export async function runKakaoCallbackRequest(input: {
  request: NextRequest;
  code: string | null;
  stateParam: string | null;
  stateCookie: string | null;
  origin: string;
  redirectUri: string;
  secure: boolean;
}) {
  const state = verifyLoginState(input.stateParam, input.stateCookie);
  const redirectWithStateCleanup = (path: string) =>
    redirectWithKakaoStateCleanup({
      path,
      origin: input.origin,
      secure: input.secure,
    });

  if (!input.code) {
    return redirectWithStateCleanup("/?login=missing_code");
  }

  if (!state) {
    return redirectWithStateCleanup("/?login=invalid_state");
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return redirectWithStateCleanup("/?login=missing_client_id");
  }

  const flowResult = await runKakaoCallbackFlow({
    request: input.request,
    code: input.code,
    clientId,
    redirectUri: input.redirectUri,
    origin: input.origin,
    platform: state.platform,
  });

  if (!flowResult.ok) {
    return redirectWithStateCleanup(
      resolveKakaoFlowFailurePath(flowResult.reason)
    );
  }

  const response = NextResponse.redirect(flowResult.redirectTo, 302);
  clearKakaoStateCookie(response, input.secure);
  if (flowResult.attachResult.cookieToSet) {
    response.cookies.set(
      flowResult.attachResult.cookieToSet.name,
      flowResult.attachResult.cookieToSet.value,
      flowResult.attachResult.cookieToSet.options
    );
  }
  return response;
}
