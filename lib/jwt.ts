import crypto from "crypto";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET missing");
const secretKey: string = secret;

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function sign(
  payload: object,
  ttlSec = 600
): { token: string; exp: number } {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSec;
  const fullPayload = { ...payload, iat, exp };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(fullPayload)));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(
    crypto.createHmac("sha256", secretKey).update(data).digest()
  );
  return { token: `${data}.${signature}`, exp };
}

export function verify(token: string): any {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature)
    throw new Error("Invalid token");
  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = base64url(
    crypto.createHmac("sha256", secretKey).update(data).digest()
  );
  if (expected !== signature) throw new Error("Invalid signature");
  const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const payload = JSON.parse(Buffer.from(padded, "base64").toString());
  if (payload.exp <= Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}
