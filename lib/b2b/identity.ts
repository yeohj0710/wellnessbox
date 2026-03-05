import "server-only";

import { createHash } from "crypto";
import { normalizePhone } from "@/lib/otp";

const DEFAULT_B2B_IDENTITY_SALT = "wellnessbox-b2b-identity-v1";
const B2B_BIRTHDATE_PATTERN = /^\d{8}$/;
const B2B_PHONE_PATTERN = /^\d{10,11}$/;
const B2B_IDENTITY_HASH_PATTERN = /^[0-9a-f]{64}$/;

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

export class B2bEmployeeIdentityValidationError extends Error {
  readonly code = "B2B_EMPLOYEE_IDENTITY_INVALID";
  readonly issues: string[];

  constructor(issues: string[]) {
    super("B2B employee identity is invalid after normalization.");
    this.name = "B2bEmployeeIdentityValidationError";
    this.issues = issues;
  }
}

function assertValidNormalizedIdentity(identity: B2bEmployeeIdentity) {
  const issues: string[] = [];
  if (identity.name.length < 1) issues.push("name");
  if (!B2B_BIRTHDATE_PATTERN.test(identity.birthDate)) issues.push("birthDate");
  if (!B2B_PHONE_PATTERN.test(identity.phoneNormalized)) issues.push("phoneNormalized");
  if (!B2B_IDENTITY_HASH_PATTERN.test(identity.identityHash)) issues.push("identityHash");
  if (issues.length > 0) {
    throw new B2bEmployeeIdentityValidationError(issues);
  }
}

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

  const identity: B2bEmployeeIdentity = {
    name,
    birthDate,
    phoneNormalized,
    identityHash,
  };
  assertValidNormalizedIdentity(identity);
  return identity;
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
