import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { ensureClient, resolveOrCreateClientId } from "@/lib/server/client";
import { consumeAppTransferToken } from "@/lib/auth/kakao/appBridge";
import { publicOrigin, resolveRequestOrigin } from "@/lib/server/origin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const h = await headers();
  const requestOrigin = resolveRequestOrigin(h, req.url);
  const origin = publicOrigin(requestOrigin);

  const { token } = await ctx.params;

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
  const nextProfileImage =
    profile?.profileImageUrl ?? payload.profileImageUrl ?? undefined;
  const nextKakaoEmail = profile?.kakaoEmail ?? payload.kakaoEmail ?? undefined;

  const appClientId = profile?.clientId ?? resolveOrCreateClientId(null);

  if (!profile) {
    await ensureClient(appClientId, {
      userAgent: req.headers.get("user-agent"),
    });
    await db.appUser.create({
      data: {
        kakaoId: kakaoIdStr,
        clientId: appClientId,
        nickname: nextNickname ?? null,
        email: nextEmail ?? null,
        profileImageUrl: nextProfileImage ?? null,
        kakaoEmail: nextKakaoEmail ?? null,
      },
    });
  } else if (!profile.clientId) {
    await ensureClient(appClientId, {
      userAgent: req.headers.get("user-agent"),
    });
    await db.appUser.update({
      where: { kakaoId: kakaoIdStr },
      data: { clientId: appClientId },
    });
  }

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

  return response;
}
