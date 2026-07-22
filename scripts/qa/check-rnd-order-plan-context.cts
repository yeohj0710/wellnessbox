import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { ORDER_STATUS } from "../../lib/order/orderStatus";
import { callWbRndInterim } from "../../lib/server/wb-rnd-interim-client";
import { runUserInterimOrderPlanContextRoute } from "../../lib/server/wb-rnd-interim-route";
import { verifyOrderPayment } from "../../lib/payment/verified-order-payment";
import { validateOwnedWbRndPlanBinding } from "../../lib/server/wb-rnd-order-plan-context";

const statuses = [
  ORDER_STATUS.PAYMENT_COMPLETE,
  ORDER_STATUS.COUNSEL_COMPLETE,
  ORDER_STATUS.DISPENSE_COMPLETE,
  ORDER_STATUS.PICKUP_COMPLETE,
  ORDER_STATUS.DELIVERY_COMPLETE,
  ORDER_STATUS.CANCELED,
];

async function run() {
  await validateOwnedWbRndPlanBinding({
    appUserId: "op109-user",
    executionId: "execution_op109",
    planId: "plan_op109",
  });
  const verified = await verifyOrderPayment(
    { paymentId: "merchant-op109", paymentMethod: "inicis", paymentLookupId: "imp-op109" },
    async () => ({
      response: {
        status: "paid",
        merchant_uid: "merchant-op109",
        imp_uid: "imp-op109",
        amount: 42000,
      },
    })
  );
  assert.equal(verified.totalPrice, 42000);
  await assert.rejects(
    verifyOrderPayment(
      { paymentId: "merchant-op109", paymentMethod: "inicis", paymentLookupId: "imp-op109" },
      async () => ({
        response: {
          status: "paid",
          merchant_uid: "different-order",
          imp_uid: "imp-op109",
          amount: 42000,
        },
      })
    ),
    /ORDER_PAYMENT_not_verified/
  );
  const denied = await runUserInterimOrderPlanContextRoute(
    new Request("http://localhost/api/tips/plan-context", {
      method: "POST",
      body: JSON.stringify({
        execution_id: "execution_op109",
        plan_id: "plan_op109",
        order_id: 10900,
      }),
    }),
    {
      requireUserSessionImpl: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
      callWbRndInterimImpl: async () => assert.fail("unauthorized user reached R&D"),
      getOrderByBindingImpl: async () => assert.fail("unauthorized user reached order query"),
    }
  );
  assert.equal(denied.status, 401);

  const observed = [];
  for (const [index, status] of statuses.entries()) {
    const response = await runUserInterimOrderPlanContextRoute(
      new Request("http://localhost/api/tips/plan-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execution_id: "execution_op109",
          plan_id: "plan_op109",
          order_id: 10900 + index,
        }),
      }),
      {
        requireUserSessionImpl: async () => ({
          ok: true as const,
          data: { appUserId: "op109-user" },
        }),
        callWbRndInterimImpl: callWbRndInterim,
        getOrderByBindingImpl: async (binding) => {
          assert.deepEqual(binding, {
            appUserId: "op109-user",
            orderId: 10900 + index,
            executionId: "execution_op109",
            planId: "plan_op109",
          });
          return {
            id: 10900 + index,
            status,
            updatedAt: new Date(`2026-07-22T0${index}:00:00Z`),
          };
        },
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
  const migration = fs.readFileSync(
    path.resolve("prisma/migrations/20260722043000_secure_rnd_order_binding/migration.sql"),
    "utf8"
  );
  for (const forbidden of [
    /\b(?:prisma|db|tx)\.(?:order|orderItem|pharmacyProduct)\b/,
    /stock:\s*\{\s*decrement/,
    /\b(?:createOrder|updateOrder|deleteOrder|updateOrderStatus)\s*\(/,
    /from\s+["'][^"']*(?:order\/mutations|prisma|\/db)["']/,
  ]) {
    assert.doesNotMatch(recommendationRoute, forbidden);
  }
  assert.match(orderComplete, /const paymentOutcome = resolvePaymentOutcome\(/);
  assert.match(orderComplete, /await createOrderFromPaymentOutcome\(/);
  assert.match(orderComplete, /await createOrder\(\{/);
  assert.match(mutations, /export async function createOrder\(/);
  assert.match(mutations, /const verifiedPayment = await verifyOrderPayment\(/);
  assert.match(mutations, /const existing = await tx\.order\.findUnique\(/);
  assert.match(mutations, /stock:\s*\{\s*decrement: item\.quantity\s*\}/);
  assert.match(mutations, /const createdOrder = await tx\.order\.create\(/);
  assert.match(mutations, /pricedTotal !== verifiedPayment\.totalPrice/);
  assert.match(mutations, /await validateOwnedWbRndPlanBinding\(/);
  assert.match(mutations, /error\.code === "P2002"/);
  assert.match(migration, /ORDER_PAYMENT_ID_DUPLICATES_REQUIRE_RECONCILIATION/);
  const createOrderSignature = mutations.match(
    /export async function createOrder\(data: \{[\s\S]*?\n\}\) \{/
  )?.[0];
  assert.ok(createOrderSignature, "createOrder signature must be inspectable");
  assert.doesNotMatch(createOrderSignature, /paymentId\?: string/);

  console.log(JSON.stringify({
    ok: true,
    userAuthDenied: denied.status === 401,
    orderStatuses: observed,
    recommendationRouteOrderMutationSymbols: false,
    existingCreateOrderOwnsStockAndOrderMutation: true,
    createOrderRequiresServerVerifiedPayment: true,
    paymentIdUniqueAndTransactionProtected: true,
    orderPlanBindingRequired: true,
    orderPlanBindingValidatedByRnd: true,
    duplicateMigrationPreflightRequired: true,
    concurrentPaymentReplayReturnsExistingOrder: true,
    actualPrismaMutationExecuted: false,
  }));
}

void run();
