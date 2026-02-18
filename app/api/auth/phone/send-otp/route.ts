import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOtp, hashOtp, normalizePhone } from "@/lib/otp";
import { sendOtpSms } from "@/lib/solapi";

export const runtime = "nodejs";
const PHONE_OTP_EXPIRES_MS = 5 * 60 * 1000;
const PHONE_OTP_RESEND_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.PHONE_OTP_RESEND_COOLDOWN_MS ?? 20 * 1000)
);

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 형식이 올바르지 않아요." },
      { status: 400 }
    );
  }

  const phoneInput =
    typeof (body as any)?.phone === "string"
      ? ((body as any).phone as string)
      : "";
  const phone = normalizePhone(phoneInput);

  if (phone.length < 9 || phone.length > 11) {
    return NextResponse.json(
      { ok: false, error: "전화번호 형식을 확인해 주세요." },
      { status: 400 }
    );
  }

  const now = Date.now();

  try {
    const recentOtp = await db.phoneOtp.findFirst({
      where: {
        phone,
        createdAt: { gte: new Date(now - PHONE_OTP_RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOtp) {
      const elapsedMs = Math.max(0, now - recentOtp.createdAt.getTime());
      const retryAfterMs = Math.max(
        0,
        PHONE_OTP_RESEND_COOLDOWN_MS - elapsedMs
      );
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return NextResponse.json(
        {
          ok: false,
          error: `인증번호 재요청은 ${retryAfterSec}초 후에 가능해요.`,
          retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    const code = generateOtp();
    const codeHash = hashOtp(phone, code);
    const expiresAt = new Date(now + PHONE_OTP_EXPIRES_MS);

    await db.phoneOtp.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });

    await sendOtpSms(phone, code);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-otp error", {
      name: (e as any)?.name,
      code: (e as any)?.code,
      message: (e as any)?.message,
      meta: (e as any)?.meta,
    });

    // Prisma P2021: table does not exist (ex: public.PhoneOtp)
    if ((e as any)?.code === "P2021") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "서버 설정 문제로 인증번호를 보낼 수 없어요. 잠시 후 다시 시도해 주세요.",
          detail: (e as any)?.message,
          meta: (e as any)?.meta,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "인증번호 전송 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        detail: (e as any)?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
