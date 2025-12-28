import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { ensureClient } from "@/lib/server/client";

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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

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

  const clientId = String(user.kakaoId);
  await ensureClient(clientId);

  const profile = await db.userProfile.findUnique({
    where: { clientId },
    select: { data: true },
  });

  const currentData = isPlainObject(profile?.data)
    ? (profile!.data as Record<string, unknown>)
    : {};

  const kakaoEmailFromDb =
    typeof currentData.kakaoEmail === "string" ? currentData.kakaoEmail : undefined;
  const nextKakaoEmail = kakaoEmailFromDb ?? user.kakaoEmail ?? user.email ?? undefined;

  const nextData = {
    ...currentData,
    nickname,
    email,
    profileImageUrl,
    kakaoEmail: nextKakaoEmail ?? null,
  } satisfies Record<string, unknown>;

  if (profile) {
    await db.userProfile.update({
      where: { clientId },
      data: { data: nextData as Prisma.InputJsonValue },
    });
  } else {
    await db.userProfile.create({
      data: {
        clientId,
        data: nextData as Prisma.InputJsonValue,
      },
    });
  }

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
