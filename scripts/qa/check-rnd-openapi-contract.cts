import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { WB_RND_INTERIM_OPERATIONS } from "../../lib/server/wb-rnd-interim-contract";

type OpenApiContract = {
  schema_version: string;
  paths: Record<string, Record<string, unknown>>;
  component_schemas: Record<string, unknown>;
};

const contract = JSON.parse(
  readFileSync(resolve("contracts/wb-rnd/interim-openapi-surface-v1.json"), "utf8")
) as OpenApiContract;

assert.equal(contract.schema_version, "wb_rnd_interim_openapi_surface_v1");
assert.ok(Object.keys(contract.component_schemas).length > 0);

for (const [method, path] of WB_RND_INTERIM_OPERATIONS) {
  assert.ok(contract.paths[path], `OpenAPI path missing: ${path}`);
  assert.ok(contract.paths[path][method.toLowerCase()], `OpenAPI operation missing: ${method} ${path}`);
}

const sourceFiles = [
  "lib/server/wb-rnd-interim-client.ts",
  "lib/server/wb-rnd-interim-route.ts",
  "lib/server/wb-rnd-order-plan-context.ts",
  "lib/server/tips-lab/rnd-session-replay.ts",
];
const registeredPaths = new Set(WB_RND_INTERIM_OPERATIONS.map(([, path]) => path));
const discoveredPaths = new Set<string>();
for (const file of sourceFiles) {
  const source = readFileSync(resolve(file), "utf8");
  for (const match of source.matchAll(/\/v1\/interim\/[A-Za-z0-9_?&=${}/.-]+/g)) {
    const normalized = match[0]
      .split("?", 1)[0]
      .replace("${executionId}", "{execution_id}")
      .replace("${reviewId}", "{review_id}");
    if (normalized !== "/v1/interim/") discoveredPaths.add(normalized);
  }
}
for (const path of discoveredPaths) {
  assert.ok(registeredPaths.has(path), `TypeScript operation registry missing used path: ${path}`);
}

console.log(JSON.stringify({
  ok: true,
  schemaVersion: contract.schema_version,
  registeredOperationCount: WB_RND_INTERIM_OPERATIONS.length,
  discoveredUsedPathCount: discoveredPaths.size,
  openApiPathCount: Object.keys(contract.paths).length,
  componentSchemaCount: Object.keys(contract.component_schemas).length,
}));
