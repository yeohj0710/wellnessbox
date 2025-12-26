import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashOtp, normalizePhone } from "@/lib/otp";
import getSession from "@/lib/session";

export const runtime = "nodejs";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function badRequest(message = "Invalid input") {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
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

  const phoneInput =
    typeof (body as any)?.phone === "string" ? ((body as any).phone as string) : "";
  const codeInput =
    typeof (body as any)?.code === "string" ? ((body as any).code as string) : "";

  const phone = normalizePhone(phoneInput);

  if (phone.length < 9 || phone.length > 11 || codeInput.length === 0) {
    return badRequest();
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

    const linkedAt = now.toISOString();

    session.user = { ...user, phone, phoneLinkedAt: linkedAt };
    await session.save();

    return NextResponse.json({ ok: true, phone, linkedAt });
  } catch (e) {
    console.error("link-phone error", {
      name: (e as any)?.name,
      code: (e as any)?.code,
      message: (e as any)?.message,
      meta: (e as any)?.meta,
    });

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
