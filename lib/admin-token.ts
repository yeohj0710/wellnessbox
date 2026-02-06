const TOKEN_VERSION = "v1";

function bytesToBase64Url(bytes: Uint8Array): string {
  let base64 = "";
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    base64 = btoa(binary);
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signHmac(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function getSigningSecret(): string | null {
  const secret = process.env.COOKIE_PASSWORD;
  if (!secret) return null;
  return secret;
}

function getAdminMaterial(): string | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return null;
  return `${TOKEN_VERSION}:admin:${adminPassword}`;
}

export async function buildAdminCookieToken(): Promise<string | null> {
  const secret = getSigningSecret();
  const material = getAdminMaterial();
  if (!secret || !material) return null;
  const signature = await signHmac(secret, material);
  return `${TOKEN_VERSION}.${signature}`;
}

export async function isValidAdminCookieToken(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  const expected = await buildAdminCookieToken();
  if (!expected) return false;
  return token === expected;
}
