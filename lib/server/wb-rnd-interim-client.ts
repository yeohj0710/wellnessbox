import "server-only";

import { createHmac } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 7_500;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 15_000;

export const WB_RND_INTERIM_MODE = "PROXY_GOLD_SIMULATION" as const;

type InterimMethod = "GET" | "POST";

function truthy(value: string | undefined) {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

export function isWbRndInterimEnabled() {
  return truthy(process.env.WB_RND_INTERIM_ENABLED);
}

function baseUrl() {
  const raw = (process.env.WB_RND_INTERIM_BASE_URL ?? "").trim();
  if (!raw) throw new Error("WB_RND_INTERIM_BASE_URL_missing");
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("WB_RND_INTERIM_BASE_URL_invalid_protocol");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function timeoutMs() {
  const value = Number.parseInt(process.env.WB_RND_INTERIM_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, value));
}

function token() {
  const value = (process.env.WB_RND_INTERIM_TOKEN ?? "").trim();
  if (!value) throw new Error("WB_RND_INTERIM_TOKEN_missing");
  return value;
}

export function pseudonymizeInterimUserId(appUserId: string) {
  const salt = (process.env.WB_RND_INTERIM_PSEUDONYM_SALT ?? "").trim();
  if (!salt) throw new Error("WB_RND_INTERIM_PSEUDONYM_SALT_missing");
  return `usr_${createHmac("sha256", salt).update(appUserId).digest("hex").slice(0, 32)}`;
}

export async function callWbRndInterim<T>(
  path: string,
  method: InterimMethod,
  body?: unknown
): Promise<T> {
  if (!isWbRndInterimEnabled()) throw new Error("WB_RND_INTERIM_disabled");
  if (!path.startsWith("/v1/interim/") || path.includes("..") || path.includes("//")) {
    throw new Error("WB_RND_INTERIM_path_rejected");
  }
  const origin = baseUrl();
  const url = new URL(path, `${origin.origin}/`);
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-wb-rnd-token": token(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`WB_RND_INTERIM_upstream_${response.status}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(handle);
  }
}
