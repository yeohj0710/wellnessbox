import crypto from "crypto";

let hasWarnedMissingPepper = false;

function getOtpPepper(): string {
  const envPepper = process.env.OTP_PEPPER;

  if (envPepper) return envPepper;

  if (process.env.NODE_ENV !== "production") {
    if (!hasWarnedMissingPepper) {
      console.warn(
        "OTP_PEPPER is not set; using a development fallback pepper instead"
      );
      hasWarnedMissingPepper = true;
    }

    return "dev-otp-pepper";
  }

  throw new Error("OTP_PEPPER is not configured");
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82")) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) return digits;
  return digits;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtp(phone: string, code: string): string {
  const pepper = getOtpPepper();
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${phone}:${code}`)
    .digest("hex");
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function hashEmailOtp(email: string, code: string): string {
  const pepper = getOtpPepper();
  const normalizedEmail = normalizeEmail(email);
  return crypto
    .createHash("sha256")
    .update(`${pepper}:email:${normalizedEmail}:${code}`)
    .digest("hex");
}
