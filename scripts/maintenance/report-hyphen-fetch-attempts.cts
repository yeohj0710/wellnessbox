import { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_PROVIDER = "HYPHEN_NHIS";
const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_TOP_USERS = 20;

type CliOptions = {
  provider: string;
  windowHours: number;
  topUsers: number;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function parseCliOptions(argv: string[]): CliOptions {
  let provider = process.env.HYPHEN_NHIS_PROVIDER || DEFAULT_PROVIDER;
  let windowHours = parsePositiveInt(
    process.env.HYPHEN_NHIS_REPORT_WINDOW_HOURS,
    DEFAULT_WINDOW_HOURS
  );
  let topUsers = parsePositiveInt(
    process.env.HYPHEN_NHIS_REPORT_TOP_USERS,
    DEFAULT_TOP_USERS
  );

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === "--window-hours") {
      windowHours = parsePositiveInt(argv[i + 1], windowHours);
      i += 1;
      continue;
    }

    if (token.startsWith("--window-hours=")) {
      windowHours = parsePositiveInt(token.split("=")[1], windowHours);
      continue;
    }

    if (token === "--top-users") {
      topUsers = parsePositiveInt(argv[i + 1], topUsers);
      i += 1;
      continue;
    }

    if (token.startsWith("--top-users=")) {
      topUsers = parsePositiveInt(token.split("=")[1], topUsers);
      continue;
    }

    if (token === "--provider") {
      const next = argv[i + 1]?.trim();
      if (next) provider = next;
      i += 1;
      continue;
    }

    if (token.startsWith("--provider=")) {
      const value = token.split("=")[1]?.trim();
      if (value) provider = value;
    }
  }

  return {
    provider,
    windowHours,
    topUsers,
  };
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function summarizeTopUsers(rows: Array<{ appUserId: string; count: number }>) {
  if (rows.length === 0) return "none";
  return rows.map((row) => `${row.appUserId}:${row.count}`).join(", ");
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const prisma = new PrismaClient();
  const since = new Date(Date.now() - options.windowHours * 60 * 60 * 1000);

  try {
    const baseWhere = {
      provider: options.provider,
      createdAt: { gte: since },
    } as const;

    const [total, okCount, failCount, forceCount, cachedCount] = await Promise.all([
      prisma.healthProviderFetchAttempt.count({
        where: baseWhere,
      }),
      prisma.healthProviderFetchAttempt.count({
        where: {
          ...baseWhere,
          ok: true,
        },
      }),
      prisma.healthProviderFetchAttempt.count({
        where: {
          ...baseWhere,
          ok: false,
        },
      }),
      prisma.healthProviderFetchAttempt.count({
        where: {
          ...baseWhere,
          forceRefresh: true,
        },
      }),
      prisma.healthProviderFetchAttempt.count({
        where: {
          ...baseWhere,
          cached: true,
        },
      }),
    ]);

    const topUsers = await prisma.$queryRaw<
      Array<{ appUserId: string; count: bigint }>
    >(
      Prisma.sql`
      SELECT "appUserId", COUNT(*)::bigint AS "count"
      FROM "HealthProviderFetchAttempt"
      WHERE "provider" = ${options.provider}
        AND "createdAt" >= ${since}
      GROUP BY "appUserId"
      ORDER BY COUNT(*) DESC
      LIMIT ${options.topUsers}
    `
    );
    const normalizedTopUsers = topUsers.map((row) => ({
      appUserId: row.appUserId,
      count: Number(row.count),
    }));

    const lines = [
      `[nhis-attempt-report] provider=${options.provider}`,
      `[nhis-attempt-report] windowHours=${options.windowHours} since=${since.toISOString()}`,
      `[nhis-attempt-report] total=${total} ok=${okCount} fail=${failCount} force=${forceCount} cached=${cachedCount}`,
      `[nhis-attempt-report] successRate=${pct(okCount, total)} forceRate=${pct(
        forceCount,
        total
      )}`,
      `[nhis-attempt-report] topUsers(${options.topUsers})=${summarizeTopUsers(normalizedTopUsers)}`,
    ];

    console.log(lines.join("\n"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  ) {
    console.error(
      "[nhis-attempt-report] skipped: HealthProviderFetchAttempt table is missing. Apply Prisma migrations first."
    );
    process.exit(0);
  }
  console.error("[nhis-attempt-report] failed", error);
  process.exit(1);
});
