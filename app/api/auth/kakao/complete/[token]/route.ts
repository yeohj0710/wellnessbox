import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { attachClientToAppUser, withClientCookie } from "@/lib/server/client-link";
import { consumeAppTransferToken } from "@/lib/auth/kakao/appBridge";
import { publicOrigin, resolveRequestOrigin } from "@/lib/server/origin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const h = await headers();
  const requestOrigin = resolveRequestOrigin(h, req.url);
  const origin = publicOrigin(requestOrigin);
  const token = params.token;

  const payload = await consumeAppTransferToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/?login=invalid_transfer", origin));
  }

  const kakaoIdStr = String(payload.kakaoId);
  const profile = await db.appUser.findUnique({
    where: { kakaoId: kakaoIdStr },
    select: {
      kakaoId: true,
      nickname: true,
      email: true,
      profileImageUrl: true,
      kakaoEmail: true,
      clientId: true,
    },
  });

  const nextNickname = profile?.nickname ?? payload.nickname ?? undefined;
  const nextEmail = profile?.email ?? payload.email ?? undefined;
  const nextProfileImage = profile?.profileImageUrl ?? payload.profileImageUrl ?? undefined;
  const nextKakaoEmail = profile?.kakaoEmail ?? payload.kakaoEmail ?? undefined;

  const attachResult = await attachClientToAppUser({
    req,
    kakaoId: kakaoIdStr,
    source: "kakao-app-bridge",
    candidateClientId: payload.clientId ?? profile?.clientId ?? null,
    userAgent: req.headers.get("user-agent"),
    allowMerge: true,
  });

  const session = await getSession();
  session.user = {
    kakaoId: payload.kakaoId,
    loggedIn: true,
    nickname: nextNickname,
    profileImageUrl: nextProfileImage,
    email: nextEmail,
    kakaoEmail: nextKakaoEmail,
  };
  await session.save();

  const response = NextResponse.redirect(new URL("/", origin));

  if (attachResult.cookieToSet) {
    withClientCookie(response, attachResult.cookieToSet);
  }

  return response;
}
