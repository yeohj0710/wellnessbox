/* eslint-disable no-console */
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
});

require("ts-node/register");
require("./check-b2b-score-engine.cts");
