import crypto from "crypto";

const OTP_PEPPER = process.env.OTP_PEPPER;

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
  if (!OTP_PEPPER) {
    throw new Error("OTP_PEPPER is not configured");
  }
  return crypto
    .createHash("sha256")
    .update(`${OTP_PEPPER}:${phone}:${code}`)
    .digest("hex");
}
