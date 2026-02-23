const { spawnSync } = require("node:child_process");

const tsNodeBin = require.resolve("ts-node/dist/bin.js");
const cmd = process.execPath;
const args = [tsNodeBin, "scripts/maintenance/smoke-hyphen-ai-summary.cts"];

const env = {
  ...process.env,
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: "CommonJS" }),
};

const result = spawnSync(cmd, args, {
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error("[nhis-ai-summary-smoke] launcher error", result.error);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
