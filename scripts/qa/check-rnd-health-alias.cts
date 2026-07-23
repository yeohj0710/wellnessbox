import assert from "node:assert/strict";
import http from "node:http";

import { getWbRndHealthAlias } from "../../lib/server/wb-rnd-health";
import { GET } from "../../app/api/internal/rnd/health/route";

async function main() {
  let responseMode = "ready";
  const server = http.createServer((request, response) => {
    assert.equal(request.url, "/health");
    if (responseMode === "non-2xx") {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "unavailable" }));
      return;
    }
    if (responseMode === "invalid-json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("not-json");
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: responseMode === "ready" ? "ok" : "unhealthy",
        environment: "staging",
        deployment_contract: {
          status:
            responseMode === "ready"
              ? "READY_FOR_PROVIDER_DEPLOYMENT"
              : "NOT_READY",
        },
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
  Object.assign(process.env, env);
  const healthy = await getWbRndHealthAlias(env);
  assert.equal(healthy.status, 200);
  assert.deepEqual(healthy.body, {
    status: "ok",
    alias: "wellnessbox-rnd",
  });

  const routeResponse = await GET();
  assert.equal(routeResponse.status, 200);
  assert.deepEqual(await routeResponse.json(), healthy.body);

  responseMode = "local";
  const localFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ status: "ok", deployment_contract: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const local = await getWbRndHealthAlias(env, localFetch);
  assert.equal(local.status, 200);
  const production = await getWbRndHealthAlias(
    {
      ...env,
      NODE_ENV: "production",
      WB_RND_SERVICE_BASE_URL: "https://rnd.example.test",
    },
    localFetch
  );
  assert.equal(production.status, 503);

  for (const mode of ["degraded", "non-2xx", "invalid-json"]) {
    responseMode = mode;
    const unavailable = await getWbRndHealthAlias(env);
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.body.status, "unavailable");
  }

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
