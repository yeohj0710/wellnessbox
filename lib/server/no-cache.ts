import "server-only";

const CACHE_CONTROL_NO_CACHE = "no-store, no-cache, must-revalidate";

export const NO_CACHE_HEADERS = {
  "Cache-Control": CACHE_CONTROL_NO_CACHE,
  Pragma: "no-cache",
} as const;

export const NO_CACHE_HEADERS_NO_PRAGMA = {
  "Cache-Control": CACHE_CONTROL_NO_CACHE,
} as const;
