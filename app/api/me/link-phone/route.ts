import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashOtp, normalizePhone } from "@/lib/otp";
import getSession from "@/lib/session";
import { backfillOrdersForAppUser } from "@/lib/server/app-user-sync";
import { requireUserSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

function unauthorized(message = "로그인 정보가 확인되지 않아요. 다시 로그인해 주세요.") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function badRequest(message = "입력값을 다시 확인해 주세요.") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireUserSession();
  if (!auth.ok) return unauthorized();
  const { kakaoId } = auth.data;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return badRequest("요청 형식이 올바르지 않아요.");
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
        { ok: false, error: "인증번호를 찾을 수 없어요. 다시 요청해 주세요." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (otp.attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: "인증번호 입력 횟수를 초과했어요. 다시 요청해 주세요." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const expectedHash = hashOtp(phone, codeInput);
    if (otp.codeHash !== expectedHash) {
      await db.phoneOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json(
        { ok: false, error: "인증번호가 일치하지 않아요." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await db.phoneOtp.update({
      where: { id: otp.id },
      data: { usedAt: now, attempts: { increment: 1 } },
    });

    const linkedAt = now.toISOString();
    const linkedAtDate = new Date(linkedAt);
    const profile = await db.appUser.findUnique({
      where: { kakaoId },
      select: { clientId: true },
    });
    const resolvedClientId = profile?.clientId ?? undefined;

    const updatedUser = await db.appUser.upsert({
      where: { kakaoId },
      create: {
        kakaoId,
        clientId: resolvedClientId ?? undefined,
        phone,
        phoneLinkedAt: linkedAtDate,
      },
      update: {
        clientId: resolvedClientId ?? undefined,
        phone,
        phoneLinkedAt: linkedAtDate,
      },
    });

    await backfillOrdersForAppUser(updatedUser.id, phone);

    const session = await getSession();
    if (session.user?.loggedIn) {
      session.user = { ...session.user, phone, phoneLinkedAt: linkedAt };
      await session.save();
    }

    const response = NextResponse.json(
      { ok: true, phone, linkedAt },
      { headers: { "Cache-Control": "no-store" } }
    );

    return response;
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
        error: "전화번호 인증 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
        detail: (e as any)?.message ?? String(e),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
