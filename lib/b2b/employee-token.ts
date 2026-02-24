import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;
export const B2B_EMPLOYEE_TOKEN_COOKIE = "wb_b2b_employee";

type EmployeeTokenPayload = {
  version: string;
  employeeId: string;
  identityHash: string;
  exp: number;
};

function getTokenSecret() {
  return (
    process.env.B2B_EMPLOYEE_TOKEN_SECRET ||
    process.env.COOKIE_PASSWORD ||
    null
  );
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

export function buildB2bEmployeeAccessToken(input: {
  employeeId: string;
  identityHash: string;
  ttlSeconds?: number;
}) {
  const secret = getTokenSecret();
  if (!secret) {
    throw new Error("B2B employee token secret is not configured");
  }

  const ttlSeconds = Math.max(60, input.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const payload: EmployeeTokenPayload = {
    version: TOKEN_VERSION,
    employeeId: input.employeeId,
    identityHash: input.identityHash,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${TOKEN_VERSION}.${encodedPayload}`, secret);
  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyB2bEmployeeAccessToken(
  token: string | null | undefined
): EmployeeTokenPayload | null {
  if (!token) return null;
  const secret = getTokenSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, encodedPayload, signature] = parts;
  if (version !== TOKEN_VERSION) return null;

  const expectedSignature = sign(`${version}.${encodedPayload}`, secret);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as EmployeeTokenPayload;
    if (payload.version !== TOKEN_VERSION) return null;
    if (!payload.employeeId || !payload.identityHash) return null;
    if (!Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getB2bEmployeeCookieOptions(ttlSeconds = DEFAULT_TTL_SECONDS) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.max(60, Math.floor(ttlSeconds)),
  };
}
