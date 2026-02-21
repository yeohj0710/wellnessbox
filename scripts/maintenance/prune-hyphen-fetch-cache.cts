import { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_PROVIDER = "HYPHEN_NHIS";
const DEFAULT_EXPIRED_GRACE_DAYS = 7;

type CliOptions = {
  provider: string;
  graceDays: number;
  dryRun: boolean;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function parseCliOptions(argv: string[]): CliOptions {
  let provider = process.env.HYPHEN_NHIS_PROVIDER || DEFAULT_PROVIDER;
  let graceDays = parsePositiveInt(
    process.env.HYPHEN_NHIS_FETCH_CACHE_EXPIRED_GRACE_DAYS,
    DEFAULT_EXPIRED_GRACE_DAYS
  );
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (token === "--grace-days") {
      graceDays = parsePositiveInt(argv[i + 1], graceDays);
      i += 1;
      continue;
    }

    if (token.startsWith("--grace-days=")) {
      graceDays = parsePositiveInt(token.split("=")[1], graceDays);
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
    graceDays,
    dryRun,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const prisma = new PrismaClient();
  const cutoff = new Date(
    Date.now() - options.graceDays * 24 * 60 * 60 * 1000
  );

  try {
    const targetCount = await prisma.healthProviderFetchCache.count({
      where: {
        provider: options.provider,
        expiresAt: { lt: cutoff },
      },
    });

    const modeLabel = options.dryRun ? "dry-run" : "delete";
    console.log(
      `[nhis-cache-prune] mode=${modeLabel} provider=${options.provider} graceDays=${options.graceDays} cutoff=${cutoff.toISOString()} targetRows=${targetCount}`
    );

    if (options.dryRun || targetCount === 0) {
      return;
    }

    const deleted = await prisma.healthProviderFetchCache.deleteMany({
      where: {
        provider: options.provider,
        expiresAt: { lt: cutoff },
      },
    });

    console.log(`[nhis-cache-prune] deletedRows=${deleted.count}`);
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
      "[nhis-cache-prune] skipped: HealthProviderFetchCache table is missing. Apply Prisma migrations first."
    );
    process.exit(0);
  }
  console.error("[nhis-cache-prune] failed", error);
  process.exit(1);
});
