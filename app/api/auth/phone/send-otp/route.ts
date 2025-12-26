import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOtp, hashOtp, normalizePhone } from "@/lib/otp";
import { sendOtpSms } from "@/lib/solapi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const phoneInput = typeof body?.phone === "string" ? body.phone : "";
  const phone = normalizePhone(phoneInput);

  if (phone.length < 9 || phone.length > 11) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const now = Date.now();
  const recentOtp = await db.phoneOtp.findFirst({
    where: {
      phone,
      createdAt: { gte: new Date(now - 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentOtp) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
}
