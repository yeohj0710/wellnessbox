import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { getClientIdFromRequest } from "@/lib/server/client";
import {
  isNicknameAvailable,
  normalizeNickname,
} from "@/lib/nickname";

export const runtime = "nodejs";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  const user = session.user;

  if (!user?.loggedIn || typeof user.kakaoId !== "number") {
    return unauthorized();
  }

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
      String(user.kakaoId)
    );

    if (!available) {
      return badRequest("이미 사용 중인 닉네임이에요. 다른 이름을 시도해 주세요.");
    }
  }

  const profile = await db.appUser.findUnique({
    where: { kakaoId: String(user.kakaoId) },
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

  const nextKakaoEmail = profile?.kakaoEmail ?? user.kakaoEmail ?? user.email ?? undefined;
  const resolvedClientId =
    (await getClientIdFromRequest()) ?? profile?.clientId ?? undefined;

  await db.appUser.upsert({
    where: { kakaoId: String(user.kakaoId) },
    create: {
      kakaoId: String(user.kakaoId),
      clientId: resolvedClientId,
      nickname: nickname || null,
      email: email || null,
      profileImageUrl: profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
    update: {
      clientId: resolvedClientId,
      nickname: nickname || null,
      email: email || null,
      profileImageUrl: profileImageUrl || null,
      kakaoEmail: nextKakaoEmail || null,
    },
  });

  session.user = {
    ...user,
    nickname: nickname || undefined,
    email: email || undefined,
    profileImageUrl: profileImageUrl || undefined,
    kakaoEmail: nextKakaoEmail,
  };
  await session.save();

  return NextResponse.json(
    {
      ok: true,
      nickname,
      email,
      profileImageUrl,
      kakaoEmail: nextKakaoEmail,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
