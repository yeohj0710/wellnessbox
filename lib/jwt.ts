import crypto from "crypto";

const secret = process.env.JWT_SECRET || "";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function sign(payload: any): { token: string; exp: number } {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 10; // 10 minutes
  const fullPayload = { ...payload, iat, exp };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(
    Buffer.from(JSON.stringify(fullPayload))
  );
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(
    crypto.createHmac("sha256", secret).update(data).digest()
  );
  return { token: `${data}.${signature}`, exp };
}

export function verify(token: string): any {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("Invalid token");
  }
  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = base64url(
    crypto.createHmac("sha256", secret).update(data).digest()
  );
  if (expected !== signature) {
    throw new Error("Invalid signature");
  }
  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64").toString()
  );
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return payload;
}
