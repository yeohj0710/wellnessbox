import "server-only";

import { z } from "zod";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateOtp, hashOtp, normalizePhone } from "@/lib/otp";
import { sendOtpSms } from "@/lib/solapi";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

const MIN_PHONE_LENGTH = 9;
const MAX_PHONE_LENGTH = 11;
const MAX_OTP_ATTEMPTS = 5;
const PHONE_OTP_EXPIRES_MS = 5 * 60 * 1000;
const PHONE_OTP_RESEND_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.PHONE_OTP_RESEND_COOLDOWN_MS ?? 20 * 1000)
);

const phoneSchema = z.object({
  phone: z.string().trim().min(1),
});

const phoneCodeSchema = phoneSchema.extend({
  code: z.string().trim().min(1),
});

const OTP_REASON_MESSAGES: Record<PhoneOtpVerifyFailureReason, string> = {
  not_found:
    "\uC778\uC99D\uBC88\uD638\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4 \uB2E4\uC2DC \uC694\uCCAD\uD574 \uC8FC\uC138\uC694.",
  too_many_attempts:
    "\uC778\uC99D\uBC88\uD638 \uC785\uB825 \uD69F\uC218\uB97C \uCD08\uACFC\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC694\uCCAD\uD574 \uC8FC\uC138\uC694.",
  mismatch:
    "\uC778\uC99D\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC544\uC694.",
};

function isPhoneLengthValid(phone: string) {
  return phone.length >= MIN_PHONE_LENGTH && phone.length <= MAX_PHONE_LENGTH;
}

function normalizePhoneValue(input: string) {
  return normalizePhone(input);
}

export type ParsePhoneBodyResult =
  | { ok: true; data: { phone: string } }
  | { ok: false };

export type ParsePhoneCodeBodyResult =
  | { ok: true; data: { phone: string; code: string } }
  | { ok: false };

export type PhoneOtpVerifyFailureReason =
  | "not_found"
  | "too_many_attempts"
  | "mismatch";

export type PhoneOtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: PhoneOtpVerifyFailureReason };

export type IssuePhoneOtpResult =
  | { ok: true }
  | { ok: false; reason: "cooldown"; retryAfterSec: number };

export function parsePhoneBody(raw: unknown): ParsePhoneBodyResult {
  const parsed = phoneSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const phone = normalizePhoneValue(parsed.data.phone);
  if (!isPhoneLengthValid(phone)) return { ok: false };

  return { ok: true, data: { phone } };
}

export function parsePhoneCodeBody(raw: unknown): ParsePhoneCodeBodyResult {
  const parsed = phoneCodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const phone = normalizePhoneValue(parsed.data.phone);
  if (!isPhoneLengthValid(phone)) return { ok: false };

  return {
    ok: true,
    data: {
      phone,
      code: parsed.data.code,
    },
  };
}

export async function verifyAndConsumePhoneOtp(input: {
  phone: string;
  code: string;
  now?: Date;
}): Promise<PhoneOtpVerifyResult> {
  const now = input.now ?? new Date();
  const otp = await db.phoneOtp.findFirst({
    where: {
      phone: input.phone,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      attempts: true,
      codeHash: true,
    },
  });

  if (!otp) {
    return { ok: false, reason: "not_found" };
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const expectedHash = hashOtp(input.phone, input.code);
  if (otp.codeHash !== expectedHash) {
    await db.phoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "mismatch" };
  }

  const consumed = await db.phoneOtp.updateMany({
    where: {
      id: otp.id,
      codeHash: expectedHash,
      usedAt: null,
      attempts: { lt: MAX_OTP_ATTEMPTS },
      expiresAt: { gt: now },
    },
    data: {
      usedAt: now,
      attempts: { increment: 1 },
    },
  });

  if (consumed.count === 0) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true };
}

export async function issuePhoneOtp(input: {
  phone: string;
  now?: Date;
}): Promise<IssuePhoneOtpResult> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const phone = normalizePhoneValue(input.phone);

  const recentOtp = await db.phoneOtp.findFirst({
    where: {
      phone,
      createdAt: { gte: new Date(nowMs - PHONE_OTP_RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recentOtp) {
    const elapsedMs = Math.max(0, nowMs - recentOtp.createdAt.getTime());
    const retryAfterMs = Math.max(0, PHONE_OTP_RESEND_COOLDOWN_MS - elapsedMs);
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { ok: false, reason: "cooldown", retryAfterSec };
  }

  const code = generateOtp();
  const codeHash = hashOtp(phone, code);
  const expiresAt = new Date(nowMs + PHONE_OTP_EXPIRES_MS);

  await db.phoneOtp.create({
    data: {
      phone,
      codeHash,
      expiresAt,
    },
  });

  await sendOtpSms(phone, code);
  return { ok: true };
}

export function resolvePhoneOtpFailure(input: {
  reason: PhoneOtpVerifyFailureReason;
}) {
  switch (input.reason) {
    case "not_found":
      return { status: 404, error: OTP_REASON_MESSAGES.not_found };
    case "too_many_attempts":
      return { status: 429, error: OTP_REASON_MESSAGES.too_many_attempts };
    default:
      return { status: 400, error: OTP_REASON_MESSAGES.mismatch };
  }
}

const PHONE_SEND_REQUEST_FORMAT_INVALID_ERROR =
  "\uC694\uCCAD \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694.";
const PHONE_SEND_FORMAT_INVALID_ERROR =
  "\uC804\uD654\uBC88\uD638 \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const PHONE_SEND_FAILED_ERROR =
  "\uC778\uC99D\uBC88\uD638 \uC804\uC1A1 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

const PHONE_VERIFY_INVALID_REQUEST_ERROR =
  "\uC785\uB825\uAC12\uC744 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const PHONE_VERIFY_FAILED_ERROR =
  "\uC778\uC99D \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runPhoneSendOtpPostRoute(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return noStoreJson(
      { ok: false, error: PHONE_SEND_REQUEST_FORMAT_INVALID_ERROR },
      400
    );
  }

  const parsed = parsePhoneBody(body);
  if (!parsed.ok) {
    return noStoreJson({ ok: false, error: PHONE_SEND_FORMAT_INVALID_ERROR }, 400);
  }

  const now = Date.now();
  const phone = parsed.data.phone;

  try {
    const issued = await issuePhoneOtp({ phone, now: new Date(now) });
    if (!issued.ok && issued.reason === "cooldown") {
      const retryAfterSec = issued.retryAfterSec;

      return NextResponse.json(
        {
          ok: false,
          error: `\uC778\uC99D\uBC88\uD638 \uC7AC\uC694\uCCAD\uC740 ${retryAfterSec}\uCD08 \uD6C4\uC5D0 \uAC00\uB2A5\uD574\uC694.`,
          retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    const dbError = resolveDbRouteError(error, PHONE_SEND_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function runPhoneVerifyOtpPostRoute(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = parsePhoneCodeBody(body);
    if (!parsed.ok) {
      return noStoreJson({ ok: false, error: PHONE_VERIFY_INVALID_REQUEST_ERROR }, 400);
    }

    const verified = await verifyAndConsumePhoneOtp(parsed.data);
    if (!verified.ok) {
      const failure = resolvePhoneOtpFailure({ reason: verified.reason });
      return noStoreJson({ ok: false, error: failure.error }, failure.status);
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    const dbError = resolveDbRouteError(error, PHONE_VERIFY_FAILED_ERROR);
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
