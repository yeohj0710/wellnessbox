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
  if (false) {
    // @ts-expect-error Unregistered paths must fail the TypeScript contract.
    void callWbRndInterim("/v1/interim/unregistered", "GET");
    // @ts-expect-error Registered paths must reject the wrong HTTP method.
    void callWbRndInterim("/v1/interim/status", "POST");
  }
  const unsafeCall = callWbRndInterim as (...arguments_: unknown[]) => Promise<unknown>;
  await assert.rejects(
    () => unsafeCall("/v1/interim/unregistered", "GET"),
    /WB_RND_INTERIM_operation_not_registered/
  );
  await assert.rejects(
    () => unsafeCall("/v1/interim/status", "POST"),
    /WB_RND_INTERIM_operation_not_registered/
  );

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
  let nonJsonRetryCalls = 0;
  const nonJsonRecovered = await callWbRndInterim<{ recovered: boolean }>(
    "/v1/interim/status",
    "GET",
    undefined,
    {
      fetchImpl: async () => {
        nonJsonRetryCalls += 1;
        return nonJsonRetryCalls === 1
          ? new Response("upstream unavailable", { status: 503 })
          : response(200, { recovered: true });
      },
      sleep: async () => undefined,
    }
  );
  assert.deepEqual(nonJsonRecovered, { recovered: true });
  assert.equal(nonJsonRetryCalls, 2);

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
  process.env.WB_RND_INTERIM_TIMEOUT_MS = "1";
  const timerStartedAt = Date.now();
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/profiles", "POST", {}, {
      fetchImpl: async (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      }),
    }),
    (error: unknown) => error instanceof Error && error.name === "AbortError"
  );
  const timeoutElapsedMs = Date.now() - timerStartedAt;
  assert.ok(timeoutElapsedMs >= 450 && timeoutElapsedMs < 1_500);
  delete process.env.WB_RND_INTERIM_TIMEOUT_MS;

  resetWbRndInterimCircuitForTests();
  let clientErrorCalls = 0;
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(
      () => callWbRndInterim("/v1/interim/status", "GET", undefined, {
        fetchImpl: async () => {
          clientErrorCalls += 1;
          return response(401, { error: "unauthorized" });
        },
      }),
      /WB_RND_INTERIM_upstream_401/
    );
  }
  const afterClientErrors = await callWbRndInterim<{ healthy: boolean }>(
    "/v1/interim/status",
    "GET",
    undefined,
    { fetchImpl: async () => { clientErrorCalls += 1; return response(200, { healthy: true }); } }
  );
  assert.deepEqual(afterClientErrors, { healthy: true });
  assert.equal(clientErrorCalls, 4);

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
  let releaseHalfOpen: (() => void) | undefined;
  const halfOpen = callWbRndInterim<{ healthy: boolean }>(
    "/v1/interim/status",
    "GET",
    undefined,
    {
      fetchImpl: async () => {
        await new Promise<void>((resolve) => { releaseHalfOpen = resolve; });
        return response(200, { healthy: true });
      },
      now: () => now,
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(
    () => callWbRndInterim("/v1/interim/status", "GET", undefined, {
      fetchImpl: async () => assert.fail("concurrent half-open call reached network"),
      now: () => now,
    }),
    /WB_RND_INTERIM_circuit_open/
  );
  assert.ok(releaseHalfOpen);
  releaseHalfOpen();
  assert.deepEqual(await halfOpen, { healthy: true });

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
      unregistered_operation_rejected_at_type_and_runtime: true,
      wrong_method_rejected_at_type_and_runtime: true,
      non_json_retryable_response_retried: true,
      post_not_retried: true,
      actual_timeout_timer_clamped_and_aborted: true,
      non_retryable_4xx_does_not_open_circuit: true,
      circuit_opens_after_three_failed_calls: true,
      open_circuit_skips_network: true,
      half_open_recovers_after_30_seconds: true,
      half_open_allows_single_probe: true,
      actual_admin_route_fallback_bounded: true,
    },
    observed: {
      retryCalls,
      retrySleeps,
      nonJsonRetryCalls,
      postCalls,
      clientErrorCalls,
      circuitFetchCalls,
    },
  }));
}

void run();
