import "server-only";

export type HeadersLike = { get(name: string): string | null };

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function canonicalizeHost(origin: string) {
  const u = new URL(origin);
  const host = u.host.replace(/^www\./, "");
  return `${u.protocol}//${host}`;
}

export function resolveRequestOrigin(headers: HeadersLike, requestUrl?: string) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;

  const proto = headers.get("x-forwarded-proto") || "http";
  const host = headers.get("x-forwarded-host") || headers.get("host");

  if (host) return `${proto}://${host}`;
  if (requestUrl) return new URL(requestUrl).origin;

  throw new Error("Unable to resolve origin");
}

export function publicOrigin(origin: string) {
  const base = canonicalizeHost(origin);

  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return "http://localhost:3000";
  }

  if (base.includes("wellnessbox.me")) {
    return "https://wellnessbox.me";
  }

  return stripTrailingSlash(base);
}

export function kakaoRedirectUri(origin: string) {
  return `${publicOrigin(origin)}/api/auth/kakao/callback`;
}
