import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { runKakaoCompleteTransferFlow } from "@/lib/auth/kakao/complete-route";
import { publicOrigin, resolveRequestOrigin } from "@/lib/server/origin";

const KAKAO_COMPLETE_INVALID_TRANSFER_PATH = "/?login=invalid_transfer";
const KAKAO_COMPLETE_SUCCESS_PATH = "/";

function buildKakaoCompleteRedirect(path: string, origin: string) {
  return NextResponse.redirect(new URL(path, origin));
}

export type KakaoCompleteRouteContext = {
  params: Promise<{ token: string }>;
};

export async function runKakaoCompleteGetRoute(
  req: NextRequest,
  ctx: KakaoCompleteRouteContext
) {
  const h = await headers();
  const requestOrigin = resolveRequestOrigin(h, req.url);
  const origin = publicOrigin(requestOrigin);
  const { token } = await ctx.params;

  const flowResult = await runKakaoCompleteTransferFlow({
    req,
    token,
  });
  if (!flowResult.ok) {
    return buildKakaoCompleteRedirect(KAKAO_COMPLETE_INVALID_TRANSFER_PATH, origin);
  }

  const response = buildKakaoCompleteRedirect(KAKAO_COMPLETE_SUCCESS_PATH, origin);
  if (flowResult.attachResult.cookieToSet) {
    response.cookies.set(
      flowResult.attachResult.cookieToSet.name,
      flowResult.attachResult.cookieToSet.value,
      flowResult.attachResult.cookieToSet.options
    );
  }

  return response;
}
