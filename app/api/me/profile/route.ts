import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { getClientIdFromRequest } from "@/lib/server/client";

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

function normalizeInput(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
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

  const nickname = normalizeInput((body as any)?.nickname, 60);
  const email = normalizeInput((body as any)?.email, 120);
  const profileImageUrl = normalizeInput((body as any)?.profileImageUrl, 500);

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
