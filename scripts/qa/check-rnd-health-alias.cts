import assert from "node:assert/strict";
import http from "node:http";

import { getWbRndHealthAlias } from "../../lib/server/wb-rnd-health";

async function main() {
  const server = http.createServer((request, response) => {
    assert.equal(request.url, "/health");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: "ok",
        environment: "staging",
        deployment_contract: { status: "READY_FOR_PROVIDER_DEPLOYMENT" },
      })
    );
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
  const address = server.address();
  assert(address && typeof address === "object");
  const env = {
    ...process.env,
    NODE_ENV: "test",
    WB_RND_RECOMMEND_ENABLED: "1",
    WB_RND_SERVICE_BASE_URL: `http://127.0.0.1:${address.port}`,
    WB_RND_SERVICE_TOKEN: "canonical-test-token-material-32-bytes",
    WB_RND_RECOMMEND_TIMEOUT_MS: "1000",
  };
  const healthy = await getWbRndHealthAlias(env);
  assert.equal(healthy.status, 200);
  assert.deepEqual(healthy.body, {
    status: "ok",
    alias: "wellnessbox-rnd",
    upstreamStatus: "ok",
    upstreamEnvironment: "staging",
    deploymentReady: true,
  });

  const disabled = await getWbRndHealthAlias({});
  assert.equal(disabled.status, 503);
  assert.equal(disabled.body.status, "disabled");
  console.log("R&D health alias QA passed");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
