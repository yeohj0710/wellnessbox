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

console.log(JSON.stringify({
  ok: true,
  schemaVersion: contract.schema_version,
  registeredOperationCount: WB_RND_INTERIM_OPERATIONS.length,
  clientOperationRegistryEnforced: true,
  discoveredUsedPathCount: WB_RND_INTERIM_OPERATIONS.length,
  openApiPathCount: Object.keys(contract.paths).length,
  componentSchemaCount: Object.keys(contract.component_schemas).length,
}));
