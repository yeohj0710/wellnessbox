import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { hashOtp, normalizePhone } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json();
  const phoneInput = typeof body?.phone === "string" ? body.phone : "";
  const codeInput = typeof body?.code === "string" ? body.code : "";

  const phone = normalizePhone(phoneInput);
  if (phone.length < 9 || phone.length > 11 || codeInput.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const now = new Date();
  const otp = await db.phoneOtp.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "OTP not found" }, { status: 404 });
  }

  if (otp.attempts >= 5) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const expectedHash = hashOtp(phone, codeInput);
  if (otp.codeHash !== expectedHash) {
    await db.phoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await db.$transaction([
    db.phoneOtp.update({
      where: { id: otp.id },
      data: { usedAt: now, attempts: { increment: 1 } },
    }),
    db.user.update({
      where: { id: userId },
      data: { phoneNumber: phone, phoneVerifiedAt: now },
    }),
    db.order.updateMany({
      where: { userId: null, buyerPhone: phone },
      data: { userId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
