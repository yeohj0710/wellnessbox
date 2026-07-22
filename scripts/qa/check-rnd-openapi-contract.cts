import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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

function sourceFilesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(resolve(directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFilesUnder(path));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const sourceFiles = ["app", "components", "lib"].flatMap(sourceFilesUnder);
const registeredOperations = new Set(
  WB_RND_INTERIM_OPERATIONS.map(([method, path]) => `${method} ${path}`)
);
const discoveredOperations = new Set<string>();
for (const file of sourceFiles) {
  const source = readFileSync(resolve(file), "utf8");
  const callPattern = /\b(?:callWbRndInterim|callInterim)(?:<[^;\n]+>)?\s*\(\s*([`"])(\/v1\/interim\/.*?)\1\s*,\s*"(GET|POST)"/gs;
  for (const match of source.matchAll(callPattern)) {
    const normalized = match[2]
      .split("?", 1)[0]
      .replace("${executionId}", "{execution_id}")
      .replace("${reviewId}", "{review_id}");
    discoveredOperations.add(`${match[3]} ${normalized}`);
  }
}
assert.deepEqual(
  [...discoveredOperations].sort(),
  [...registeredOperations].sort(),
  "TypeScript operation registry must exactly match every R&D call across app/components/lib"
);

console.log(JSON.stringify({
  ok: true,
  schemaVersion: contract.schema_version,
  registeredOperationCount: WB_RND_INTERIM_OPERATIONS.length,
  scannedSourceFileCount: sourceFiles.length,
  discoveredUsedPathCount: discoveredOperations.size,
  openApiPathCount: Object.keys(contract.paths).length,
  componentSchemaCount: Object.keys(contract.component_schemas).length,
}));
