/* eslint-disable no-console */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const ROOT = path.resolve(__dirname, "..", "..");
const DB_ENV_PATH = path.join(ROOT, "lib", "db-env.ts");

const DB_KEYS = [
  "WELLNESSBOX_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "WELLNESSBOX_URL_NON_POOLING",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
];

const URL_A_POOL =
  "postgresql://user:pw@host-a.example.com:5432/db_a?pgbouncer=true";
const URL_A_DIRECT = "postgresql://user:pw@host-a-direct.example.com:5432/db_a";
const URL_B_POOL =
  "postgresql://user:pw@host-b.example.com:5432/db_b?pgbouncer=true";
const URL_B_DIRECT = "postgresql://user:pw@host-b-direct.example.com:5432/db_b";

function freshDbEnvModule() {
  delete require.cache[require.resolve(DB_ENV_PATH)];
  return require(DB_ENV_PATH);
}

function resetDbEnvVars() {
  for (const key of DB_KEYS) {
    delete process.env[key];
  }
}

function withEnv(overrides, work) {
  const snapshot = new Map();
  const keys = [...new Set(["NODE_ENV", ...Object.keys(overrides), ...DB_KEYS])];
  for (const key of keys) {
    snapshot.set(key, process.env[key]);
  }

  resetDbEnvVars();
  for (const [key, value] of Object.entries(overrides)) {
    if (value == null) continue;
    process.env[key] = String(value);
  }

  try {
    return work();
  } finally {
    for (const [key, value] of snapshot.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function runDbEnvCase(name, overrides, verifier) {
  withEnv(overrides, () => {
    const { ensurePrismaEnvConfigured } = freshDbEnvModule();
    const result = ensurePrismaEnvConfigured(true);
    verifier(result);
  });
  console.log(`[qa:b2b-sync-guard] PASS ${name}`);
}

function runDbEnvChecks() {
  runDbEnvCase(
    "case-A wellness-only priority",
    {
      NODE_ENV: "test",
      WELLNESSBOX_PRISMA_URL: URL_A_POOL,
      WELLNESSBOX_URL_NON_POOLING: URL_A_DIRECT,
    },
    (result) => {
      assert.equal(result.ok, true);
      assert.equal(result.databaseKey, "WELLNESSBOX_PRISMA_URL");
      assert.equal(result.directKey, "WELLNESSBOX_URL_NON_POOLING");
      assert.equal(result.conflicts.length, 0);
    }
  );

  runDbEnvCase(
    "case-B database-url only fallback",
    {
      NODE_ENV: "test",
      DATABASE_URL: URL_A_POOL,
      DIRECT_URL: URL_A_DIRECT,
    },
    (result) => {
      assert.equal(result.ok, true);
      assert.equal(result.databaseKey, "DATABASE_URL");
      assert.equal(result.directKey, "DIRECT_URL");
      assert.equal(result.conflicts.length, 0);
    }
  );

  runDbEnvCase(
    "case-C dual source same host no conflict",
    {
      NODE_ENV: "test",
      WELLNESSBOX_PRISMA_URL: URL_A_POOL,
      DATABASE_URL: URL_A_POOL,
      WELLNESSBOX_URL_NON_POOLING: URL_A_DIRECT,
      DIRECT_URL: URL_A_DIRECT,
    },
    (result) => {
      assert.equal(result.ok, true);
      assert.equal(result.databaseKey, "WELLNESSBOX_PRISMA_URL");
      assert.equal(result.directKey, "WELLNESSBOX_URL_NON_POOLING");
      assert.equal(result.conflicts.length, 0);
    }
  );

  runDbEnvCase(
    "case-D production mismatch blocked",
    {
      NODE_ENV: "production",
      WELLNESSBOX_PRISMA_URL: URL_A_POOL,
      DATABASE_URL: URL_B_POOL,
      WELLNESSBOX_URL_NON_POOLING: URL_A_DIRECT,
      DIRECT_URL: URL_B_DIRECT,
    },
    (result) => {
      assert.equal(result.ok, false);
      assert.equal(result.databaseKey, "WELLNESSBOX_PRISMA_URL");
      assert.equal(result.directKey, "WELLNESSBOX_URL_NON_POOLING");
      assert.ok(result.conflicts.length >= 1);
      assert.ok(
        result.errors.some(
          (message) =>
            message.includes("host mismatch") || message.includes("DB URL")
        )
      );
    }
  );

  withEnv(
    {
      NODE_ENV: "development",
      WELLNESSBOX_PRISMA_URL: URL_A_POOL,
      DATABASE_URL: URL_B_POOL,
      WELLNESSBOX_URL_NON_POOLING: URL_A_DIRECT,
      DIRECT_URL: URL_B_DIRECT,
    },
    () => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args);
      };
      try {
        const { ensurePrismaEnvConfigured } = freshDbEnvModule();
        const result = ensurePrismaEnvConfigured(true);
        assert.equal(result.ok, true);
        assert.ok(result.conflicts.length >= 1);
        assert.ok(warnings.length >= 1);
      } finally {
        console.warn = originalWarn;
      }
    }
  );
  console.log("[qa:b2b-sync-guard] PASS case-E development mismatch warns");
}

function runStaticChecks() {
  const dbErrorSource = fs.readFileSync(
    path.join(ROOT, "lib", "server", "db-error.ts"),
    "utf8"
  );
  assert.ok(dbErrorSource.includes("DB_SCHEMA_MISMATCH"));
  assert.ok(dbErrorSource.includes("P2021"));
  assert.ok(dbErrorSource.includes("P2022"));

  const syncRouteSource = fs.readFileSync(
    path.join(ROOT, "lib", "b2b", "employee-sync-route.ts"),
    "utf8"
  );
  assert.ok(syncRouteSource.includes("access log failed"));
  assert.ok(syncRouteSource.includes("execute sync failed"));

  const clientUtilsSource = fs.readFileSync(
    path.join(
      ROOT,
      "app",
      "(features)",
      "employee-report",
      "_lib",
      "client-utils.ts"
    ),
    "utf8"
  );
  assert.ok(clientUtilsSource.includes("DB_SCHEMA_MISMATCH"));
  console.log("[qa:b2b-sync-guard] PASS static regression checks");
}

function run() {
  runDbEnvChecks();
  runStaticChecks();
  console.log("[qa:b2b-sync-guard] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:b2b-sync-guard] FAIL", error);
  process.exit(1);
}
