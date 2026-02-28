process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" });
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
require("./train-all-ai.ts");
