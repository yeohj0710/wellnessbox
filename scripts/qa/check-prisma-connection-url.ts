import assert from "node:assert/strict";
import { normalizePrismaConnectionUrl } from "../../lib/prisma-connection-url";

const poolerUrl =
  "postgresql://user:password@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?pgbouncer=true&sslmode=require";

const production = new URL(
  normalizePrismaConnectionUrl(poolerUrl, { isServerless: true })
);
assert.equal(production.searchParams.get("connection_limit"), "1");
assert.equal(production.searchParams.get("pool_timeout"), "20");
assert.equal(production.searchParams.get("sslmode"), "require");

const explicit = new URL(
  normalizePrismaConnectionUrl(
    `${poolerUrl}&connection_limit=3&pool_timeout=7`,
    { isServerless: true, connectionLimit: "1", poolTimeout: "20" }
  )
);
assert.equal(explicit.searchParams.get("connection_limit"), "3");
assert.equal(explicit.searchParams.get("pool_timeout"), "7");

assert.equal(normalizePrismaConnectionUrl(poolerUrl, { isServerless: false }), poolerUrl);
assert.equal(
  normalizePrismaConnectionUrl(
    "postgresql://user:password@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    { isServerless: true }
  ),
  "postgresql://user:password@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
);
assert.equal(
  normalizePrismaConnectionUrl("prisma://accelerate.example/v1/abc", {
    isServerless: true,
  }),
  "prisma://accelerate.example/v1/abc"
);
assert.equal(normalizePrismaConnectionUrl("not-a-url", { isServerless: true }), "not-a-url");

console.log("Prisma connection URL checks passed");
