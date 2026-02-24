process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
});

require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
} catch (_error) {
  // no-op
}

require("./seed-demo-reports.ts");
