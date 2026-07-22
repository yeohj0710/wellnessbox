import assert from "node:assert/strict";

import {
  callWbRndInterim,
  resetWbRndInterimCircuitForTests,
} from "../../lib/server/wb-rnd-interim-client";
import { runAdminInterimDashboardRoute } from "../../lib/server/wb-rnd-interim-route";
import { publicWbRndErrorCode } from "../../lib/server/wb-rnd-security";

process.env.WB_RND_INTERIM_ENABLED = "true";
process.env.WB_RND_INTERIM_BASE_URL = "https://rnd.resilience.test";
process.env.WB_RND_INTERIM_TOKEN = "op113-resilience-token";

const response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function run() {
  resetWbRndInterimCircuitForTests();
  const retryStatuses = [503, 200];
  const retrySleeps: number[] = [];
  let retryCalls = 0;
  const recovered = await callWbRndInterim<{ recovered: boolean }>(
    "/v1/interim/status",
    "GET",
    undefined,
    {
      fetchImpl: async () => {
        retryCalls += 1;
        const status = retryStatuses.shift() ?? 500;
        return response(status, status === 200 ? { recovered: true } : { error: "busy" });
      },
      sleep: async (milliseconds) => retrySleeps.push(milliseconds),
    }
  );
  assert.deepEqual(recovered, { recovered: true });
  assert.equal(retryCalls, 2);
  assert.deepEqual(retrySleeps, [50]);

  resetWbRndInterimCircuitForTests();
  let postCalls = 0;
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/profiles", "POST", {}, {
      fetchImpl: async () => {
        postCalls += 1;
        return response(503, { error: "busy" });
      },
      sleep: async () => assert.fail("POST must not retry"),
    }),
    /WB_RND_INTERIM_upstream_503/
  );
  assert.equal(postCalls, 1);

  resetWbRndInterimCircuitForTests();
  const timeout = new Error("injected timeout");
  timeout.name = "AbortError";
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/status", "GET", undefined, {
      fetchImpl: async () => { throw timeout; },
      sleep: async () => undefined,
    }),
    /injected timeout/
  );
  assert.equal(publicWbRndErrorCode(timeout), "R&D timeout");

  resetWbRndInterimCircuitForTests();
  let now = 1_000;
  let circuitFetchCalls = 0;
  const failingFetch = async () => {
    circuitFetchCalls += 1;
    return response(503, { error: "busy" });
  };
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(
      () => callWbRndInterim("/v1/interim/status", "GET", undefined, {
        fetchImpl: failingFetch,
        now: () => now,
        sleep: async () => undefined,
      }),
      /WB_RND_INTERIM_upstream_503/
    );
  }
  assert.equal(circuitFetchCalls, 6);
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/status", "GET", undefined, {
      fetchImpl: async () => assert.fail("open circuit reached network"),
      now: () => now,
    }),
    /WB_RND_INTERIM_circuit_open/
  );
  now += 30_000;
  const halfOpen = await callWbRndInterim<{ healthy: boolean }>(
    "/v1/interim/status",
    "GET",
    undefined,
    {
      fetchImpl: async () => response(200, { healthy: true }),
      now: () => now,
    }
  );
  assert.deepEqual(halfOpen, { healthy: true });

  const adminFallback = await runAdminInterimDashboardRoute({
    requireAdminSessionImpl: async () => ({ ok: true as const, data: null }),
    callWbRndInterimImpl: async (path) => {
      if (path.endsWith("/kpis")) throw new Error("WB_RND_INTERIM_circuit_open");
      if (path.endsWith("/status")) return { counts: {} };
      if (path.endsWith("/sources")) return { items: [], adapters: [] };
      if (path.endsWith("/runtime")) return { rules: {}, models: {}, executions: {} };
      return assert.fail(`unexpected admin path: ${path}`);
    },
  });
  const fallbackBody = await adminFallback.json();
  assert.equal(adminFallback.status, 200);
  assert.equal(fallbackBody.kpis.availability, "UNAVAILABLE");
  assert.equal(fallbackBody.kpis.error, "R&D request failed");

  console.log(JSON.stringify({
    ok: true,
    checks: {
      retryable_get_retried_once: true,
      post_not_retried: true,
      timeout_bounded: true,
      circuit_opens_after_three_failed_calls: true,
      open_circuit_skips_network: true,
      half_open_recovers_after_30_seconds: true,
      actual_admin_route_fallback_bounded: true,
    },
    observed: { retryCalls, retrySleeps, postCalls, circuitFetchCalls },
  }));
}

void run();
