import assert from "node:assert/strict";
import { NextResponse } from "next/server";

import { callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import { runAdminInterimDashboardRoute } from "../../lib/server/wb-rnd-interim-route";

async function run() {
  const denied = await runAdminInterimDashboardRoute({
    requireAdminSessionImpl: async () => ({
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }),
    callWbRndInterimImpl: async () => assert.fail("unauthorized admin reached R&D"),
  });
  assert.equal(denied.status, 401);

  const response = await runAdminInterimDashboardRoute({
    requireAdminSessionImpl: async () => ({ ok: true as const, data: null }),
    callWbRndInterimImpl: callWbRndInterim,
  });
  const body = (await response.json()) as Record<string, any>;
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(typeof body.status?.counts, "object");
  assert.equal(body.kpis?.availability, "UNAVAILABLE");
  assert.ok(Array.isArray(body.sources?.items));
  assert.ok(Array.isArray(body.sources?.adapters));

  console.log(JSON.stringify({
    ok: true,
    adminAuthDenied: denied.status === 401,
    statusCountKeys: Object.keys(body.status.counts).sort(),
    kpiAvailability: body.kpis.availability,
    sourceCount: body.sources.items.length,
    adapterCount: body.sources.adapters.length,
  }));
}

void run();
