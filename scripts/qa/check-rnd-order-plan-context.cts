import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { ORDER_STATUS } from "../../lib/order/orderStatus";
import { callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import { runUserInterimOrderPlanContextRoute } from "../../lib/server/wb-rnd-interim-route";

const statuses = [
  ORDER_STATUS.PAYMENT_COMPLETE,
  ORDER_STATUS.COUNSEL_COMPLETE,
  ORDER_STATUS.DISPENSE_COMPLETE,
  ORDER_STATUS.PICKUP_COMPLETE,
  ORDER_STATUS.DELIVERY_COMPLETE,
  ORDER_STATUS.CANCELED,
];

async function run() {
  const denied = await runUserInterimOrderPlanContextRoute(
    new Request("http://localhost/api/tips/plan-context", {
      method: "POST",
      body: JSON.stringify({ execution_id: "execution_op109", plan_id: "plan_op109" }),
    }),
    {
      requireUserSessionImpl: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
      callWbRndInterimImpl: async () => assert.fail("unauthorized user reached R&D"),
      getLatestOrderImpl: async () => assert.fail("unauthorized user reached order query"),
    }
  );
  assert.equal(denied.status, 401);

  const observed = [];
  for (const [index, status] of statuses.entries()) {
    const response = await runUserInterimOrderPlanContextRoute(
      new Request("http://localhost/api/tips/plan-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execution_id: "execution_op109", plan_id: "plan_op109" }),
      }),
      {
        requireUserSessionImpl: async () => ({
          ok: true as const,
          data: { appUserId: "op109-user" },
        }),
        callWbRndInterimImpl: callWbRndInterim,
        getLatestOrderImpl: async () => ({
          id: 10900 + index,
          status,
          updatedAt: new Date(`2026-07-22T0${index}:00:00Z`),
        }),
      }
    );
    const body = (await response.json()) as Record<string, any>;
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.read_only, true);
    assert.equal(body.order_state_effect, "NONE");
    assert.equal(body.order_state_mutation_allowed, false);
    assert.equal(body.persisted_event_count_before, body.persisted_event_count_after);
    observed.push({
      status,
      packaging_state: body.order_context.packaging_state,
      delivery_state: body.order_context.delivery_state,
      reorder_state: body.order_context.reorder_state,
      cancellation_state: body.order_context.cancellation_state,
      plan_state: body.plan_state,
    });
  }

  assert.equal(observed[2].packaging_state, "COMPLETE");
  assert.equal(observed[3].delivery_state, "IN_TRANSIT");
  assert.equal(observed[4].delivery_state, "DELIVERED");
  assert.equal(observed[4].reorder_state, "ELIGIBLE");
  assert.equal(observed[5].cancellation_state, "CANCELED");

  const recommendationRoute = fs.readFileSync(
    path.resolve("lib/server/wb-rnd-interim-route.ts"),
    "utf8"
  );
  const orderComplete = fs.readFileSync(
    path.resolve("app/(orders)/order-complete/useOrderCompleteBootstrap.ts"),
    "utf8"
  );
  const mutations = fs.readFileSync(path.resolve("lib/order/mutations.ts"), "utf8");
  assert.doesNotMatch(
    recommendationRoute,
    /\b(?:prisma\.order|prisma\.orderItem|stock:\s*\{\s*decrement)/
  );
  assert.match(orderComplete, /const paymentOutcome = resolvePaymentOutcome\(/);
  assert.match(orderComplete, /await createOrderFromPaymentOutcome\(/);
  assert.match(orderComplete, /await createOrder\(\{/);
  assert.match(mutations, /export async function createOrder\(/);
  assert.match(mutations, /stock:\s*\{\s*decrement: item\.quantity\s*\}/);
  assert.match(mutations, /const createdOrder = await tx\.order\.create\(/);

  console.log(JSON.stringify({
    ok: true,
    userAuthDenied: denied.status === 401,
    orderStatuses: observed,
    recommendationRouteOrderMutationSymbols: false,
    existingCreateOrderOwnsStockAndOrderMutation: true,
    actualPrismaMutationExecuted: false,
  }));
}

void run();
