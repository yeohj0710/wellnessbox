process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" });
require("ts-node/register/transpile-only");
require("./evaluate-kpi-rollup.ts");
