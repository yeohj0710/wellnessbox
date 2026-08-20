const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

type RuntimeOptions = {
  isServerless?: boolean;
  connectionLimit?: string;
  poolTimeout?: string;
};

function positiveInteger(value: string | undefined, fallback: string) {
  return value && /^\d+$/.test(value) && Number(value) > 0 ? value : fallback;
}

/**
 * Keep a PgBouncer-backed Prisma client within a small serverless connection budget.
 * Explicit URL parameters always win so an environment can tune the budget safely.
 */
export function normalizePrismaConnectionUrl(
  rawUrl: string,
  options: RuntimeOptions = {}
) {
  const value = rawUrl.trim();
  if (!value) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  const isServerless =
    options.isServerless ??
    (process.env.VERCEL === "1" || process.env.NODE_ENV === "production");
  if (
    !isServerless ||
    !POSTGRES_PROTOCOLS.has(url.protocol) ||
    url.searchParams.get("pgbouncer") !== "true"
  ) {
    return value;
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      positiveInteger(options.connectionLimit ?? process.env.WB_PRISMA_CONNECTION_LIMIT, "1")
    );
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set(
      "pool_timeout",
      positiveInteger(options.poolTimeout ?? process.env.WB_PRISMA_POOL_TIMEOUT, "20")
    );
  }

  return url.toString();
}
