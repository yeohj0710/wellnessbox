import assert from "node:assert/strict";
import { ensurePrismaEnvConfigured } from "../../lib/db-env";

type EnvSnapshot = Record<string, string | undefined>;

const WATCHED_KEYS = [
  "WELLNESSBOX_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "WELLNESSBOX_URL_NON_POOLING",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
  "WB_DB_ENV_WARN_CONFLICT",
] as const;

function snapshotEnv(): EnvSnapshot {
  const snapshot: EnvSnapshot = {};
  for (const key of WATCHED_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const key of WATCHED_KEYS) {
    const value = snapshot[key];
    if (typeof value === "string") {
      process.env[key] = value;
      continue;
    }
    delete process.env[key];
  }
}

function configureConflictCase(input: {
  databasePrimaryHost: string;
  databaseSecondaryHost: string;
  directPrimaryHost: string;
  directSecondaryHost: string;
}) {
  process.env.WB_DB_ENV_WARN_CONFLICT = "1";
  process.env.WELLNESSBOX_PRISMA_URL = `postgresql://qa:qa@${input.databasePrimaryHost}:5432/wellnessbox`;
  process.env.DATABASE_URL = `postgresql://qa:qa@${input.databaseSecondaryHost}:5432/wellnessbox`;
  process.env.POSTGRES_PRISMA_URL = "";
  process.env.WELLNESSBOX_URL_NON_POOLING = `postgresql://qa:qa@${input.directPrimaryHost}:5432/wellnessbox`;
  process.env.DIRECT_URL = `postgresql://qa:qa@${input.directSecondaryHost}:5432/wellnessbox`;
  process.env.POSTGRES_URL_NON_POOLING = "";
}

function run() {
  const envSnapshot = snapshotEnv();
  const originalWarn = console.warn;
  const warnCalls: unknown[][] = [];

  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  try {
    configureConflictCase({
      databasePrimaryHost: "db-primary.test",
      databaseSecondaryHost: "db-secondary.test",
      directPrimaryHost: "direct-primary.test",
      directSecondaryHost: "direct-secondary.test",
    });

    const first = ensurePrismaEnvConfigured(true);
    assert.ok(first.conflicts.length > 0, "expected conflict in first run");
    const afterFirstWarnCount = warnCalls.filter(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("[db-env] conflicting db url env detected")
    ).length;
    assert.equal(afterFirstWarnCount, 1, "first conflict signature should warn once");

    configureConflictCase({
      databasePrimaryHost: "db-primary.test",
      databaseSecondaryHost: "db-secondary.test",
      directPrimaryHost: "direct-primary.test",
      directSecondaryHost: "direct-secondary.test",
    });
    const second = ensurePrismaEnvConfigured(true);
    assert.ok(second.conflicts.length > 0, "expected conflict in second run");
    const afterSecondWarnCount = warnCalls.filter(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("[db-env] conflicting db url env detected")
    ).length;
    assert.equal(afterSecondWarnCount, 1, "same conflict signature should not warn twice");

    configureConflictCase({
      databasePrimaryHost: "db-primary.test",
      databaseSecondaryHost: "db-secondary-v2.test",
      directPrimaryHost: "direct-primary.test",
      directSecondaryHost: "direct-secondary-v2.test",
    });
    const third = ensurePrismaEnvConfigured(true);
    assert.ok(third.conflicts.length > 0, "expected conflict in third run");
    const afterThirdWarnCount = warnCalls.filter(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("[db-env] conflicting db url env detected")
    ).length;
    assert.equal(afterThirdWarnCount, 2, "changed conflict signature should warn again");

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: [
            "warn_once_for_same_conflict_signature",
            "warn_again_when_conflict_signature_changes",
          ],
        },
        null,
        2
      )
    );
  } finally {
    console.warn = originalWarn;
    restoreEnv(envSnapshot);
  }
}

run();
