import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type Platform = "web" | "app";

export type LoginStatePayload = {
  nonce: string;
  ts: number;
  platform: Platform;
  clientId: string | null;
};

function getSecret() {
  const secret = process.env.KAKAO_STATE_SECRET || process.env.COOKIE_PASSWORD;
  if (!secret) {
    throw new Error("KAKAO_STATE_SECRET or COOKIE_PASSWORD must be set");
  }
  return secret;
}

function signPayload(payload: object) {
  const secret = getSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifySignedPayload<T>(token: string | null): T | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const secret = getSecret();
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString());
    return parsed as T;
  } catch {
    return null;
  }
}

export function createLoginState(platform: Platform, clientId: string | null) {
  const nonce = randomBytes(16).toString("hex");
  const payload: LoginStatePayload = {
    nonce,
    ts: Date.now(),
    platform,
    clientId,
  };
  const token = signPayload(payload);
  return { token, nonce, payload };
}

export function verifyLoginState(
  token: string | null,
  nonce: string | null,
  maxAgeMs = 10 * 60 * 1000
): LoginStatePayload | null {
  const payload = verifySignedPayload<LoginStatePayload>(token);
  if (!payload) return null;
  if (nonce && payload.nonce !== nonce) return null;
  if (Date.now() - payload.ts > maxAgeMs) return null;
  return payload;
}
