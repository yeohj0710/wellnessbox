import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashOtp, normalizePhone } from "@/lib/otp";

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
  const codeInput =
    typeof (body as any)?.code === "string"
      ? ((body as any).code as string)
      : "";

  const phone = normalizePhone(phoneInput);
  if (phone.length < 9 || phone.length > 11 || codeInput.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 }
    );
  }

  const now = new Date();

  try {
    const otp = await db.phoneOtp.findFirst({
      where: {
        phone,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json(
        { ok: false, error: "OTP not found" },
        { status: 404 }
      );
    }

    if (otp.attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts" },
        { status: 429 }
      );
    }

    const expectedHash = hashOtp(phone, codeInput);
    if (otp.codeHash !== expectedHash) {
      await db.phoneOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { ok: false, error: "Invalid code" },
        { status: 400 }
      );
    }

    await db.phoneOtp.update({
      where: { id: otp.id },
      data: { usedAt: now, attempts: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("verify-otp error", {
      name: (e as any)?.name,
      code: (e as any)?.code,
      message: (e as any)?.message,
      meta: (e as any)?.meta,
    });

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
