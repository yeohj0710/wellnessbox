import crypto from "crypto";

const secret = process.env.JWT_SECRET || "";

function base64url(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function sign(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(
    crypto.createHmac("sha256", secret).update(data).digest()
  );
  return `${data}.${signature}`;
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
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString());
  return payload;
}
