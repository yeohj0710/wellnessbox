import { NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { hashEmailOtp, normalizeEmail } from "@/lib/otp";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

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

  const emailInput =
    typeof (body as any)?.email === "string"
      ? ((body as any).email as string)
      : "";
  const codeInput =
    typeof (body as any)?.code === "string"
      ? ((body as any).code as string)
      : "";

  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || !/^\d{6}$/.test(code)) {
    return badRequest("입력값을 다시 확인해 주세요.");
  }

  const now = new Date();
  const kakaoId = String(user.kakaoId);

  try {
    const appUser = await db.appUser.upsert({
      where: { kakaoId },
      update: {},
      create: { kakaoId },
      select: { id: true },
    });

    const otp = await db.emailOtp.findFirst({
      where: {
        userId: appUser.id,
        email,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json(
        { ok: false, error: "인증번호를 찾을 수 없어요." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (otp.attemptCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { ok: false, error: "인증 시도 한도를 초과했어요." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const expectedHash = hashEmailOtp(email, code);

    if (otp.codeHash !== expectedHash) {
      await db.emailOtp.update({
        where: { id: otp.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
        },
      });

      return NextResponse.json(
        { ok: false, error: "인증번호가 올바르지 않아요. 다시 시도해 주세요." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const emailOwner = await db.appUser.findFirst({
      where: { email, kakaoId: { not: kakaoId } },
      select: { id: true },
    });

    if (emailOwner) {
      return NextResponse.json(
        { ok: false, error: "이미 사용 중인 이메일이에요." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    await db.emailOtp.update({
      where: { id: otp.id },
      data: { usedAt: now, attemptCount: { increment: 1 }, lastAttemptAt: now },
    });

    await db.appUser.update({
      where: { kakaoId },
      data: { email },
    });

    session.user = { ...user, email };
    await session.save();

    return NextResponse.json(
      { ok: true, email },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("email verify-otp error", {
      name: (error as any)?.name,
      code: (error as any)?.code,
      message: (error as any)?.message,
      meta: (error as any)?.meta,
    });

    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
