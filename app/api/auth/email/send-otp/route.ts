import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOtp, hashEmailOtp, normalizeEmail } from "@/lib/otp";
import { sendEmailVerificationCode } from "@/lib/mail";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

const COOLDOWN_MS = 60 * 1000;
const EXPIRES_MS = 10 * 60 * 1000;
const DAILY_SEND_LIMIT = 10;

function badRequest(message = "Invalid input") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

function tooManyRequests(message = "Too many requests") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const auth = await requireUserSession();
  if (!auth.ok) return auth.response;
  const { kakaoId } = auth.data;

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
  const email = normalizeEmail(emailInput);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 120) {
    return badRequest("올바른 이메일 주소를 입력해 주세요.");
  }

  const now = new Date();
  try {
    const appUser = await db.appUser.upsert({
      where: { kakaoId },
      update: {},
      create: { kakaoId },
      select: { id: true, email: true },
    });

    const emailOwner = await db.appUser.findFirst({
      where: { email, kakaoId: { not: kakaoId } },
      select: { id: true },
    });

    if (emailOwner) {
      return NextResponse.json(
        { ok: false, error: "이미 다른 계정에서 사용 중인 이메일이에요." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const activeOtp = await db.emailOtp.findFirst({
      where: {
        userId: appUser.id,
        email,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (
      activeOtp?.lastSentAt &&
      now.getTime() - activeOtp.lastSentAt.getTime() < COOLDOWN_MS
    ) {
      return tooManyRequests("인증번호를 잠시 후에 다시 요청해 주세요.");
    }

    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailySend = await db.emailOtp.aggregate({
      where: { userId: appUser.id, createdAt: { gte: since } },
      _sum: { sendCount: true },
    });

    const totalSent = dailySend._sum.sendCount ?? 0;
    if (totalSent >= DAILY_SEND_LIMIT) {
      return tooManyRequests("하루 인증번호 발송 한도를 초과했어요.");
    }

    const code = generateOtp();
    const codeHash = hashEmailOtp(email, code);
    const expiresAt = new Date(now.getTime() + EXPIRES_MS);

    if (activeOtp) {
      await db.emailOtp.update({
        where: { id: activeOtp.id },
        data: {
          codeHash,
          expiresAt,
          sendCount: { increment: 1 },
          lastSentAt: now,
          attemptCount: 0,
        },
      });
    } else {
      await db.emailOtp.create({
        data: {
          userId: appUser.id,
          email,
          codeHash,
          expiresAt,
          lastSentAt: now,
        },
      });
    }

    await sendEmailVerificationCode(email, code, Math.floor(EXPIRES_MS / 60000));

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("email send-otp error", {
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
