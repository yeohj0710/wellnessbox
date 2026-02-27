import "server-only";

import { z } from "zod";
import { normalizeEmail } from "@/lib/otp";
import { EMAIL_MAX_LENGTH } from "./constants";

const emailSchema = z.object({
  email: z.string().trim().min(1),
});

const emailCodeSchema = emailSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailFormatValid(email: string) {
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(email);
}

function normalizeEmailValue(input: string) {
  return normalizeEmail(input);
}

export type ParseEmailBodyResult =
  | { ok: true; data: { email: string } }
  | { ok: false };

export type ParseEmailCodeBodyResult =
  | { ok: true; data: { email: string; code: string } }
  | { ok: false };

export function parseEmailBody(raw: unknown): ParseEmailBodyResult {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const email = normalizeEmailValue(parsed.data.email);
  if (!isEmailFormatValid(email)) return { ok: false };

  return { ok: true, data: { email } };
}

export function parseEmailCodeBody(raw: unknown): ParseEmailCodeBodyResult {
  const parsed = emailCodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };

  const email = normalizeEmailValue(parsed.data.email);
  if (!isEmailFormatValid(email)) return { ok: false };

  return {
    ok: true,
    data: {
      email,
      code: parsed.data.code,
    },
  };
}
