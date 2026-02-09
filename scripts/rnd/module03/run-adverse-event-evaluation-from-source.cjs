process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" });
require("ts-node/register/transpile-only");
require("./evaluate-adverse-event-count-from-source.ts");
