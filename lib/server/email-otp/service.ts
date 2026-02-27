import "server-only";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { sendEmailVerificationCode } from "@/lib/mail";
import { generateOtp, hashEmailOtp } from "@/lib/otp";
import {
  EMAIL_IN_USE_ERROR,
  EMAIL_OTP_COOLDOWN_MS,
  EMAIL_OTP_DAILY_SEND_LIMIT,
  EMAIL_OTP_EXPIRES_MS,
  EMAIL_OTP_REASON_MESSAGES,
  EMAIL_SEND_COOLDOWN_ERROR,
  EMAIL_SEND_DAILY_LIMIT_ERROR,
  EMAIL_SEND_IN_USE_ERROR,
  MAX_EMAIL_OTP_ATTEMPTS,
  type EmailOtpFailureReason,
} from "./constants";

type ActiveEmailOtp = {
  id: string;
  attemptCount: number;
  codeHash: string;
};

export type VerifyEmailOtpCodeResult =
  | { ok: true; data: { otpId: string } }
  | { ok: false; reason: EmailOtpFailureReason };

export type SendEmailOtpResult =
  | { ok: true }
  | { ok: false; reason: "email_in_use" }
  | { ok: false; reason: "cooldown"; retryAfterSec: number }
  | { ok: false; reason: "daily_limit" };

export type ResolvedSendEmailOtpResult =
  | { ok: true }
  | { ok: false; status: number; error: string; retryAfterSec?: number };

export type VerifyAndLinkEmailResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

async function ensureAppUserId(kakaoId: string) {
  const appUser = await db.appUser.upsert({
    where: { kakaoId },
    update: {},
    create: { kakaoId },
    select: { id: true },
  });
  return appUser.id;
}

async function findEmailOwner(input: { email: string; kakaoId: string }) {
  return db.appUser.findFirst({
    where: { email: input.email, kakaoId: { not: input.kakaoId } },
    select: { id: true },
  });
}

export async function issueEmailOtpForUser(input: {
  kakaoId: string;
  email: string;
  now?: Date;
}): Promise<SendEmailOtpResult> {
  const now = input.now ?? new Date();
  const userId = await ensureAppUserId(input.kakaoId);

  const emailOwner = await findEmailOwner({
    email: input.email,
    kakaoId: input.kakaoId,
  });
  if (emailOwner) {
    return { ok: false, reason: "email_in_use" };
  }

  const activeOtp = await db.emailOtp.findFirst({
    where: {
      userId,
      email: input.email,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      lastSentAt: true,
    },
  });

  if (
    activeOtp?.lastSentAt &&
    now.getTime() - activeOtp.lastSentAt.getTime() < EMAIL_OTP_COOLDOWN_MS
  ) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil(
        (EMAIL_OTP_COOLDOWN_MS - (now.getTime() - activeOtp.lastSentAt.getTime())) /
          1000
      )
    );
    return { ok: false, reason: "cooldown", retryAfterSec };
  }

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dailySend = await db.emailOtp.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { sendCount: true },
  });
  const totalSent = dailySend._sum.sendCount ?? 0;
  if (totalSent >= EMAIL_OTP_DAILY_SEND_LIMIT) {
    return { ok: false, reason: "daily_limit" };
  }

  const code = generateOtp();
  const codeHash = hashEmailOtp(input.email, code);
  const expiresAt = new Date(now.getTime() + EMAIL_OTP_EXPIRES_MS);

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
        userId,
        email: input.email,
        codeHash,
        expiresAt,
        lastSentAt: now,
      },
    });
  }

  await sendEmailVerificationCode(
    input.email,
    code,
    Math.floor(EMAIL_OTP_EXPIRES_MS / 60000)
  );

  return { ok: true };
}

async function findActiveEmailOtp(input: {
  userId: string;
  email: string;
  now: Date;
}): Promise<ActiveEmailOtp | null> {
  return db.emailOtp.findFirst({
    where: {
      userId: input.userId,
      email: input.email,
      usedAt: null,
      expiresAt: { gt: input.now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      attemptCount: true,
      codeHash: true,
    },
  });
}

export async function verifyEmailOtpCode(input: {
  userId: string;
  email: string;
  code: string;
  now?: Date;
}): Promise<VerifyEmailOtpCodeResult> {
  const now = input.now ?? new Date();
  const otp = await findActiveEmailOtp({
    userId: input.userId,
    email: input.email,
    now,
  });

  if (!otp) {
    return { ok: false, reason: "not_found" };
  }

  if (otp.attemptCount >= MAX_EMAIL_OTP_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const expectedHash = hashEmailOtp(input.email, input.code);
  if (otp.codeHash !== expectedHash) {
    await db.emailOtp.update({
      where: { id: otp.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true, data: { otpId: otp.id } };
}

export async function consumeVerifiedEmailOtp(input: {
  otpId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const consumed = await db.emailOtp.updateMany({
    where: {
      id: input.otpId,
      usedAt: null,
      attemptCount: { lt: MAX_EMAIL_OTP_ATTEMPTS },
      expiresAt: { gt: now },
    },
    data: {
      usedAt: now,
      attemptCount: { increment: 1 },
      lastAttemptAt: now,
    },
  });
  return consumed.count > 0;
}

export function resolveEmailOtpFailure(input: { reason: EmailOtpFailureReason }) {
  switch (input.reason) {
    case "not_found":
      return { status: 404, error: EMAIL_OTP_REASON_MESSAGES.not_found };
    case "too_many_attempts":
      return { status: 429, error: EMAIL_OTP_REASON_MESSAGES.too_many_attempts };
    default:
      return { status: 400, error: EMAIL_OTP_REASON_MESSAGES.mismatch };
  }
}

export function resolveSendEmailOtpResult(
  result: SendEmailOtpResult
): ResolvedSendEmailOtpResult {
  if (result.ok) {
    return { ok: true };
  }
  if (result.reason === "email_in_use") {
    return { ok: false, status: 409, error: EMAIL_SEND_IN_USE_ERROR };
  }
  if (result.reason === "cooldown") {
    return {
      ok: false,
      status: 429,
      error: EMAIL_SEND_COOLDOWN_ERROR,
      retryAfterSec: result.retryAfterSec,
    };
  }
  return { ok: false, status: 429, error: EMAIL_SEND_DAILY_LIMIT_ERROR };
}

export async function verifyAndLinkEmailForUser(input: {
  kakaoId: string;
  email: string;
  code: string;
  now?: Date;
}): Promise<VerifyAndLinkEmailResult> {
  const now = input.now ?? new Date();
  const userId = await ensureAppUserId(input.kakaoId);

  const verified = await verifyEmailOtpCode({
    userId,
    email: input.email,
    code: input.code,
    now,
  });
  if (!verified.ok) {
    const failure = resolveEmailOtpFailure({ reason: verified.reason });
    return { ok: false, status: failure.status, error: failure.error };
  }

  const emailOwner = await findEmailOwner({
    email: input.email,
    kakaoId: input.kakaoId,
  });
  if (emailOwner) {
    return { ok: false, status: 409, error: EMAIL_IN_USE_ERROR };
  }

  const consumed = await consumeVerifiedEmailOtp({
    otpId: verified.data.otpId,
    now,
  });
  if (!consumed) {
    const failure = resolveEmailOtpFailure({ reason: "not_found" });
    return { ok: false, status: failure.status, error: failure.error };
  }

  await db.appUser.update({
    where: { kakaoId: input.kakaoId },
    data: { email: input.email },
  });

  return { ok: true, email: input.email };
}

export async function syncEmailToUserSession(email: string) {
  const session = await getSession();
  if (!session.user?.loggedIn) return;

  session.user = { ...session.user, email };
  await session.save();
}
