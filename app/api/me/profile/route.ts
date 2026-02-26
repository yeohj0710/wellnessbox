import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { requireUserSession } from "@/lib/server/route-auth";
import {
  isNicknameAvailable,
  normalizeNickname,
} from "@/lib/nickname";

export const runtime = "nodejs";

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  const { kakaoId } = auth.data;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const nickname = normalizeNickname((body as any)?.nickname, 60);
  const email = normalizeNickname((body as any)?.email, 120);
  const profileImageUrl = normalizeNickname((body as any)?.profileImageUrl, 500);

  if (nickname) {
    const available = await isNicknameAvailable(
      nickname,
      kakaoId
    );

    if (!available) {
      return badRequest("이미 사용 중인 닉네임이에요. 다른 이름을 시도해 주세요.");
    }
  }

  const profile = await db.appUser.findUnique({
    where: { kakaoId },
    select: {
      id: true,
      kakaoId: true,
      nickname: true,
      email: true,
      profileImageUrl: true,
      kakaoEmail: true,
      clientId: true,
    },
  });

  const session = await getSession();
  const sessionUser = session.user;
  const nextKakaoEmail =
    profile?.kakaoEmail ?? sessionUser?.kakaoEmail ?? sessionUser?.email ?? undefined;
  const clientIdForUpsert = profile?.clientId ?? undefined;

  await db.appUser.upsert({
    where: { kakaoId },
    create: {
      kakaoId,
      clientId: clientIdForUpsert,
      nickname: nickname || null,
      email: email || null,
      profileImageUrl: profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
    update: {
      clientId: clientIdForUpsert,
      nickname: nickname || null,
      email: email || null,
      profileImageUrl: profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
  });

  if (session.user?.loggedIn) {
    session.user = {
      ...session.user,
      nickname: nickname || undefined,
      email: email || undefined,
      profileImageUrl: profileImageUrl || undefined,
      kakaoEmail: nextKakaoEmail,
    };
    await session.save();
  }

  const response = NextResponse.json(
    {
      ok: true,
      nickname,
      email,
      profileImageUrl,
      kakaoEmail: nextKakaoEmail,
    },
    { headers: { "Cache-Control": "no-store" } }
  );

  return response;
}
