export const CLIENT_COOKIE_NAME = "wb_cid";
export const CLIENT_ID_HEADER = "x-wb-client-id";
export const LEGACY_CLIENT_ID_HEADER = "x-client-id";
export const CLIENT_LS_KEY = "wb_client_id_v1";
export const CLIENT_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const CLIENT_ID_MIN_LENGTH = 12;
const CLIENT_ID_MAX_LENGTH = 128;

export function generateClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function isValidClientIdValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    trimmed.length >= CLIENT_ID_MIN_LENGTH &&
    trimmed.length <= CLIENT_ID_MAX_LENGTH &&
    !/\s/.test(trimmed)
  );
}

export function isLikelyBot(userAgent: string | null | undefined) {
  if (!userAgent) return false;
  return /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|pingdom)/i.test(
    userAgent
  );
}
