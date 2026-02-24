import "server-only";

import { createHash } from "crypto";
import { normalizePhone } from "@/lib/otp";

const DEFAULT_B2B_IDENTITY_SALT = "wellnessbox-b2b-identity-v1";

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, "");
}

function normalizeBirthDate(input: string) {
  return input.replace(/\D/g, "");
}

function normalizePhoneDigits(input: string) {
  return normalizePhone(input).replace(/\D/g, "");
}

function getIdentitySalt() {
  return (
    process.env.B2B_EMPLOYEE_IDENTITY_SALT ||
    process.env.HYPHEN_NHIS_CACHE_HASH_SALT ||
    DEFAULT_B2B_IDENTITY_SALT
  );
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export type B2bEmployeeIdentity = {
  name: string;
  birthDate: string;
  phoneNormalized: string;
  identityHash: string;
};

export function resolveB2bEmployeeIdentity(input: {
  name: string;
  birthDate: string;
  phone: string;
}): B2bEmployeeIdentity {
  const name = normalizeName(input.name);
  const birthDate = normalizeBirthDate(input.birthDate);
  const phoneNormalized = normalizePhoneDigits(input.phone);

  const identityBase = `name:${name.toLowerCase()}|birth:${birthDate}|phone:${phoneNormalized}`;
  const identityHash = sha256(`${getIdentitySalt()}|${identityBase}`);

  return {
    name,
    birthDate,
    phoneNormalized,
    identityHash,
  };
}

export function maskPhone(phoneNormalized: string) {
  const digits = phoneNormalized.replace(/\D/g, "");
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${"*".repeat(Math.max(0, digits.length - 7))}`;
}

export function maskBirthDate(birthDate: string) {
  const digits = birthDate.replace(/\D/g, "");
  if (digits.length < 8) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-**`;
}
