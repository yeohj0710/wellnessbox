import { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_PROVIDER = "HYPHEN_NHIS";

type CliOptions = {
  retentionDays: number;
  provider: string;
  dryRun: boolean;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function parseCliOptions(argv: string[]): CliOptions {
  let retentionDays = parsePositiveInt(
    process.env.HYPHEN_NHIS_FETCH_ATTEMPT_RETENTION_DAYS,
    DEFAULT_RETENTION_DAYS
  );
  let provider = process.env.HYPHEN_NHIS_PROVIDER || DEFAULT_PROVIDER;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (token === "--days") {
      retentionDays = parsePositiveInt(argv[i + 1], retentionDays);
      i += 1;
      continue;
    }

    if (token.startsWith("--days=")) {
      retentionDays = parsePositiveInt(token.split("=")[1], retentionDays);
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
    retentionDays,
    provider,
    dryRun,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const prisma = new PrismaClient();
  const cutoff = new Date(
    Date.now() - options.retentionDays * 24 * 60 * 60 * 1000
  );

  try {
    const targetCount = await prisma.healthProviderFetchAttempt.count({
      where: {
        provider: options.provider,
        createdAt: { lt: cutoff },
      },
    });

    const modeLabel = options.dryRun ? "dry-run" : "delete";
    console.log(
      `[nhis-prune] mode=${modeLabel} provider=${options.provider} retentionDays=${options.retentionDays} cutoff=${cutoff.toISOString()} targetRows=${targetCount}`
    );

    if (options.dryRun || targetCount === 0) {
      return;
    }

    const deleted = await prisma.healthProviderFetchAttempt.deleteMany({
      where: {
        provider: options.provider,
        createdAt: { lt: cutoff },
      },
    });

    console.log(`[nhis-prune] deletedRows=${deleted.count}`);
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
      "[nhis-prune] skipped: HealthProviderFetchAttempt table is missing. Apply Prisma migrations first."
    );
    process.exit(0);
  }
  console.error("[nhis-prune] failed", error);
  process.exit(1);
});
