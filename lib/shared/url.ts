function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function canonicalizePublicBaseUrl(value: string) {
  return value.replace(/^https:\/\/(?:www\.)?wellnessbox\.me(?=\/|$)/, "https://wellnessbox.kr");
}

function getEnvBaseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (!env) return undefined;
  try {
    const parsed = new URL(env);
    return canonicalizePublicBaseUrl(
      stripTrailingSlash(parsed.origin + parsed.pathname.replace(/\/$/, ""))
    );
  } catch {
    return canonicalizePublicBaseUrl(stripTrailingSlash(env));
  }
}

export function resolvePublicBaseUrl() {
  const env = getEnvBaseUrl();
  if (env) return env;

  if (typeof window !== "undefined" && window.location?.origin) {
    return canonicalizePublicBaseUrl(stripTrailingSlash(window.location.origin));
  }

  return undefined;
}

export function buildAbsoluteUrl(path: string, base?: string) {
  try {
    return new URL(path).toString();
  } catch {
    // continue
  }

  const origin = stripTrailingSlash(base ?? resolvePublicBaseUrl() ?? "");
  if (origin) {
    try {
      return new URL(path, origin).toString();
    } catch {
      // continue
    }
  }

  return path;
}
