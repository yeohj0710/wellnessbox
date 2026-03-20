import "server-only";

const DEFAULT_BROWSER_MAX_AGE_SECONDS = 5 * 60;
const DEFAULT_SHARED_MAX_AGE_SECONDS = 60 * 60;
const DEFAULT_STALE_WHILE_REVALIDATE_SECONDS = 24 * 60 * 60;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PUBLIC_CACHE_BROWSER_MAX_AGE_SECONDS = readPositiveInteger(
  process.env.WB_PUBLIC_CACHE_BROWSER_MAX_AGE_SECONDS,
  DEFAULT_BROWSER_MAX_AGE_SECONDS
);

export const PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS = readPositiveInteger(
  process.env.WB_PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS,
  DEFAULT_SHARED_MAX_AGE_SECONDS
);

export const PUBLIC_CACHE_STALE_WHILE_REVALIDATE_SECONDS = readPositiveInteger(
  process.env.WB_PUBLIC_CACHE_STALE_WHILE_REVALIDATE_SECONDS,
  DEFAULT_STALE_WHILE_REVALIDATE_SECONDS
);

export function buildPublicCacheControl(input?: {
  browserMaxAgeSeconds?: number;
  sharedMaxAgeSeconds?: number;
  staleWhileRevalidateSeconds?: number;
}) {
  const browserMaxAgeSeconds =
    input?.browserMaxAgeSeconds ?? PUBLIC_CACHE_BROWSER_MAX_AGE_SECONDS;
  const sharedMaxAgeSeconds =
    input?.sharedMaxAgeSeconds ?? PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS;
  const staleWhileRevalidateSeconds =
    input?.staleWhileRevalidateSeconds ??
    PUBLIC_CACHE_STALE_WHILE_REVALIDATE_SECONDS;

  return `public, max-age=${browserMaxAgeSeconds}, s-maxage=${sharedMaxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;
}
