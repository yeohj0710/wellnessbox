import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOtp, hashOtp, normalizePhone } from "@/lib/otp";
import { sendOtpSms } from "@/lib/solapi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
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
      { ok: false, error: "Invalid phone" },
      { status: 400 }
    );
  }

  const now = Date.now();

  try {
    const recentOtp = await db.phoneOtp.findFirst({
      where: {
        phone,
        createdAt: { gte: new Date(now - 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOtp) {
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const code = generateOtp();
    const codeHash = hashOtp(phone, code);
    const expiresAt = new Date(now + 5 * 60 * 1000);

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
          error: "DB table missing",
          detail: (e as any)?.message,
          meta: (e as any)?.meta,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected error",
        detail: (e as any)?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
