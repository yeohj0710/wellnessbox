/* eslint-disable no-console */
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
});

const Module = require("module");
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

require("ts-node/register");
require("tsconfig-paths/register");
require("./regenerate-reports-with-wellness.cts");
