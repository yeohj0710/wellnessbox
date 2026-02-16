#!/usr/bin/env node
process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || "tsconfig.tsnode.json";
process.env.WB_PRISMA_QUERY_LOG = process.env.WB_PRISMA_QUERY_LOG || "1";

require("ts-node/register");
require("tsconfig-paths/register");

const { performance } = require("node:perf_hooks");
const webpush = require("web-push");
const db = require("../../lib/db").default;
const notification = require("../../lib/notification");
const { ORDER_STATUS } = require("../../lib/order/orderStatus");

const RUNS = Number(process.env.PUSH_BENCH_RUNS || 7);
const PUSH_DELAY_MS = Number(process.env.PUSH_BENCH_DELAY_MS || 15);
const BENCH_CONFIG = {
  dedupeEnabled: process.env.WB_PUSH_ENABLE_DEDUPE !== "0",
  deadCleanupEnabled: process.env.WB_PUSH_CLEAN_DEAD !== "0",
  sendConcurrency: Number(process.env.WB_PUSH_SEND_CONCURRENCY || 8),
  sendRetries: Number(process.env.WB_PUSH_SEND_RETRIES || 1),
};
const BENCH_PRODUCT_PREFIX = "push-bench-product-";
const BENCH_PHARM_PREFIX = "push-bench-pharm-";
const BENCH_RIDER_PREFIX = "push-bench-rider-";
const BENCH_PAYMENT_PREFIX = "push-bench-payment-";
const BENCH_ENDPOINT_PREFIX = "https://push-bench.local/";
const BENCH_IMAGE_SRC = "/logo.png";

function buildTag(label, run) {
  return `${Date.now()}-${process.pid}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${label}-${run}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, pct) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1)
  );
  return sorted[index];
}

function summarize(samples) {
  const latencies = samples.map((sample) => sample.elapsedMs);
  return {
    runs: samples.length,
    p50Ms: Number(percentile(latencies, 50).toFixed(1)),
    p95Ms: Number(percentile(latencies, 95).toFixed(1)),
    avgMs: Number(
      (
        latencies.reduce((acc, value) => acc + value, 0) /
        Math.max(1, latencies.length)
      ).toFixed(1)
    ),
    sendAttempts: samples.reduce((acc, sample) => acc + sample.sendAttempts, 0),
    sendSuccess: samples.reduce((acc, sample) => acc + sample.sendSuccess, 0),
    sendFailure: samples.reduce((acc, sample) => acc + sample.sendFailure, 0),
    failureByType: samples.reduce((acc, sample) => {
      for (const [type, count] of Object.entries(sample.failureByType)) {
        acc[type] = (acc[type] || 0) + count;
      }
      return acc;
    }, {}),
    dbQueryAvgPerRun: Number(
      (
        samples.reduce((acc, sample) => acc + sample.dbQueries, 0) /
        Math.max(1, samples.length)
      ).toFixed(1)
    ),
    dbWriteAvgPerRun: Number(
      (
        samples.reduce((acc, sample) => acc + sample.dbWrites, 0) /
        Math.max(1, samples.length)
      ).toFixed(1)
    ),
    slowestQuery: samples
      .map((sample) => sample.slowestQuery)
      .sort((left, right) => right.durationMs - left.durationMs)[0],
  };
}

function createPushSimulator() {
  const originalSend = webpush.sendNotification;
  const counters = {
    attempts: 0,
    success: 0,
    failure: 0,
    failureByType: {},
  };

  webpush.sendNotification = async (pushSub) => {
    counters.attempts += 1;
    const endpoint = String(pushSub?.endpoint || "");
    await sleep(PUSH_DELAY_MS);

    if (endpoint.includes("/gone/")) {
      counters.failure += 1;
      counters.failureByType.dead_endpoint =
        (counters.failureByType.dead_endpoint || 0) + 1;
      const error = new Error("Gone");
      error.statusCode = 410;
      throw error;
    }

    if (endpoint.includes("/forbidden/")) {
      counters.failure += 1;
      counters.failureByType.auth_or_forbidden =
        (counters.failureByType.auth_or_forbidden || 0) + 1;
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    if (endpoint.includes("/timeout/")) {
      counters.failure += 1;
      counters.failureByType.timeout = (counters.failureByType.timeout || 0) + 1;
      const error = new Error("Timeout");
      error.code = "ETIMEDOUT";
      throw error;
    }

    counters.success += 1;
    return { statusCode: 201 };
  };

  return {
    take() {
      const snapshot = {
        attempts: counters.attempts,
        success: counters.success,
        failure: counters.failure,
        failureByType: { ...counters.failureByType },
      };
      counters.attempts = 0;
      counters.success = 0;
      counters.failure = 0;
      counters.failureByType = {};
      return snapshot;
    },
    restore() {
      webpush.sendNotification = originalSend;
    },
  };
}

function extractSlowestQuery(queryEvents) {
  if (queryEvents.length === 0) {
    return { durationMs: 0, query: "none" };
  }
  const sorted = [...queryEvents].sort(
    (left, right) => right.durationMs - left.durationMs
  );
  return sorted[0];
}

function isWriteQuery(query) {
  const normalized = String(query || "").trim().toUpperCase();
  return (
    normalized.startsWith("INSERT") ||
    normalized.startsWith("UPDATE") ||
    normalized.startsWith("DELETE")
  );
}

async function createFixture(tag) {
  const pharmacy = await db.pharmacy.create({
    data: {
      name: `${BENCH_PHARM_PREFIX}${tag}`,
      userId: `${BENCH_PHARM_PREFIX}${tag}`,
      password: "x",
    },
    select: { id: true },
  });

  const rider = await db.rider.create({
    data: {
      userId: `${BENCH_RIDER_PREFIX}${tag}`,
      password: "x",
    },
    select: { id: true },
  });

  const product = await db.product.create({
    data: {
      name: `${BENCH_PRODUCT_PREFIX}${tag}`,
      images: [BENCH_IMAGE_SRC],
    },
    select: { id: true },
  });

  const pharmacyProduct = await db.pharmacyProduct.create({
    data: {
      pharmacyId: pharmacy.id,
      productId: product.id,
      // Keep bench fixtures out of storefront queries even if cleanup is interrupted.
      stock: 0,
      price: 1000,
      optionType: "default",
    },
    select: { id: true },
  });

  const order = await db.order.create({
    data: {
      paymentId: `${BENCH_PAYMENT_PREFIX}${tag}`,
      status: ORDER_STATUS.PAYMENT_COMPLETE,
      phone: "010-0000-0000",
      pharmacyId: pharmacy.id,
      riderId: rider.id,
      orderItems: {
        create: [{ pharmacyProductId: pharmacyProduct.id, quantity: 1 }],
      },
    },
    select: { id: true, pharmacyId: true, riderId: true },
  });

  const subscriptions = [];
  const roleTargets = [
    { role: "customer", targetField: "orderId", targetId: order.id },
    { role: "pharm", targetField: "pharmacyId", targetId: pharmacy.id },
    { role: "rider", targetField: "riderId", targetId: rider.id },
  ];

  for (const target of roleTargets) {
    for (let index = 0; index < 24; index += 1) {
      let marker = "ok";
      if (index % 9 === 0) marker = "gone";
      else if (index % 11 === 0) marker = "forbidden";
      else if (index % 13 === 0) marker = "timeout";

      subscriptions.push({
        role: target.role,
        endpoint: `${BENCH_ENDPOINT_PREFIX}${tag}/${target.role}/${marker}/${index}`,
        auth: `auth-${index}`,
        p256dh: `p256dh-${index}`,
        [target.targetField]: target.targetId,
      });
    }
  }

  await db.subscription.createMany({ data: subscriptions });

  return {
    tag,
    orderId: order.id,
    pharmacyId: pharmacy.id,
    riderId: rider.id,
    productId: product.id,
    pharmacyProductId: pharmacyProduct.id,
  };
}

async function cleanupFixture(fixture) {
  if (!fixture) return;

  const deliveryTargets = [
    fixture.orderId != null ? { orderId: fixture.orderId } : null,
    fixture.pharmacyId != null ? { pharmacyId: fixture.pharmacyId } : null,
    fixture.riderId != null ? { riderId: fixture.riderId } : null,
  ].filter(Boolean);

  if (deliveryTargets.length > 0) {
    await db.pushDelivery.deleteMany({ where: { OR: deliveryTargets } });
  }

  if (fixture.tag) {
    await db.subscription.deleteMany({
      where: {
        endpoint: { startsWith: `${BENCH_ENDPOINT_PREFIX}${fixture.tag}/` },
      },
    });
  }

  if (fixture.orderId != null) {
    await db.review.deleteMany({ where: { orderId: fixture.orderId } });
    await db.message.deleteMany({ where: { orderId: fixture.orderId } });
    await db.orderItem.deleteMany({ where: { orderId: fixture.orderId } });
    await db.order.deleteMany({ where: { id: fixture.orderId } });
  }

  if (fixture.pharmacyProductId != null) {
    await db.pharmacyProduct.deleteMany({ where: { id: fixture.pharmacyProductId } });
  }
  if (fixture.productId != null) {
    await db.product.deleteMany({ where: { id: fixture.productId } });
  }
  if (fixture.pharmacyId != null) {
    await db.pharmacy.deleteMany({ where: { id: fixture.pharmacyId } });
  }
  if (fixture.riderId != null) {
    await db.rider.deleteMany({ where: { id: fixture.riderId } });
  }
}

async function cleanupStaleBenchData() {
  const [products, pharmacies, riders, orders] = await Promise.all([
    db.product.findMany({
      where: { name: { startsWith: BENCH_PRODUCT_PREFIX } },
      select: { id: true },
    }),
    db.pharmacy.findMany({
      where: { userId: { startsWith: BENCH_PHARM_PREFIX } },
      select: { id: true },
    }),
    db.rider.findMany({
      where: { userId: { startsWith: BENCH_RIDER_PREFIX } },
      select: { id: true },
    }),
    db.order.findMany({
      where: { paymentId: { startsWith: BENCH_PAYMENT_PREFIX } },
      select: { id: true },
    }),
  ]);

  const productIds = products.map((row) => row.id);
  const pharmacyIds = pharmacies.map((row) => row.id);
  const riderIds = riders.map((row) => row.id);
  const orderIds = orders.map((row) => row.id);

  const pharmacyProducts =
    productIds.length > 0 || pharmacyIds.length > 0
      ? await db.pharmacyProduct.findMany({
          where: {
            OR: [
              productIds.length > 0 ? { productId: { in: productIds } } : undefined,
              pharmacyIds.length > 0 ? { pharmacyId: { in: pharmacyIds } } : undefined,
            ].filter(Boolean),
          },
          select: { id: true },
        })
      : [];

  const pharmacyProductIds = pharmacyProducts.map((row) => row.id);
  const deliveryTargets = [
    orderIds.length > 0 ? { orderId: { in: orderIds } } : null,
    pharmacyIds.length > 0 ? { pharmacyId: { in: pharmacyIds } } : null,
    riderIds.length > 0 ? { riderId: { in: riderIds } } : null,
  ].filter(Boolean);

  if (deliveryTargets.length > 0) {
    await db.pushDelivery.deleteMany({ where: { OR: deliveryTargets } });
  }

  await db.subscription.deleteMany({
    where: {
      OR: [
        { endpoint: { startsWith: BENCH_ENDPOINT_PREFIX } },
        orderIds.length > 0 ? { orderId: { in: orderIds } } : undefined,
        pharmacyIds.length > 0 ? { pharmacyId: { in: pharmacyIds } } : undefined,
        riderIds.length > 0 ? { riderId: { in: riderIds } } : undefined,
      ].filter(Boolean),
    },
  });

  if (orderIds.length > 0 || productIds.length > 0) {
    await db.review.deleteMany({
      where: {
        OR: [
          orderIds.length > 0 ? { orderId: { in: orderIds } } : undefined,
          productIds.length > 0 ? { productId: { in: productIds } } : undefined,
        ].filter(Boolean),
      },
    });
  }

  if (orderIds.length > 0) {
    await db.message.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  }

  await db.order.deleteMany({
    where: { paymentId: { startsWith: BENCH_PAYMENT_PREFIX } },
  });

  const pharmacyProductTargets = [
    pharmacyProductIds.length > 0 ? { id: { in: pharmacyProductIds } } : null,
    productIds.length > 0 ? { productId: { in: productIds } } : null,
    pharmacyIds.length > 0 ? { pharmacyId: { in: pharmacyIds } } : null,
  ].filter(Boolean);
  if (pharmacyProductTargets.length > 0) {
    await db.pharmacyProduct.deleteMany({ where: { OR: pharmacyProductTargets } });
  }

  await Promise.all([
    db.product.deleteMany({ where: { name: { startsWith: BENCH_PRODUCT_PREFIX } } }),
    db.pharmacy.deleteMany({ where: { userId: { startsWith: BENCH_PHARM_PREFIX } } }),
    db.rider.deleteMany({ where: { userId: { startsWith: BENCH_RIDER_PREFIX } } }),
  ]);
}

async function runCase({ label, send }) {
  const samples = [];
  for (let run = 0; run < RUNS; run += 1) {
    const fixture = await createFixture(buildTag(label, run));

    try {
      const beforeQueryCount = globalQueryEvents.length;
      pushProbe.take();

      const startedAt = performance.now();
      await send(fixture.orderId);
      const elapsedMs = Number((performance.now() - startedAt).toFixed(1));

      const pushStats = pushProbe.take();
      const queryEvents = globalQueryEvents.slice(beforeQueryCount);
      const parsedQueries = queryEvents.map((event) => ({
        durationMs: Number(event.duration),
        query: String(event.query || "").replace(/\\s+/g, " ").trim(),
      }));

      samples.push({
        elapsedMs,
        sendAttempts: pushStats.attempts,
        sendSuccess: pushStats.success,
        sendFailure: pushStats.failure,
        failureByType: pushStats.failureByType,
        dbQueries: parsedQueries.length,
        dbWrites: parsedQueries.filter((query) => isWriteQuery(query.query)).length,
        slowestQuery: extractSlowestQuery(parsedQueries),
      });
    } finally {
      await cleanupFixture(fixture);
    }
  }

  return { label, ...summarize(samples) };
}

async function runDuplicateProbe() {
  const fixture = await createFixture(buildTag("duplicate-probe", 0));
  try {
    pushProbe.take();
    await notification.sendOrderNotification(
      fixture.orderId,
      ORDER_STATUS.PAYMENT_COMPLETE
    );
    const first = pushProbe.take();

    await notification.sendOrderNotification(
      fixture.orderId,
      ORDER_STATUS.PAYMENT_COMPLETE
    );
    const second = pushProbe.take();

    return {
      firstCallAttempts: first.attempts,
      secondCallAttempts: second.attempts,
      duplicateSendBlocked: second.attempts === 0,
    };
  } finally {
    await cleanupFixture(fixture);
  }
}

const globalQueryEvents = [];
const pushProbe = createPushSimulator();

async function main() {
  await cleanupStaleBenchData();

  (db).$on("query", (event) => {
    globalQueryEvents.push(event);
  });

  const customerCase = await runCase({
    label: "customer_sendOrderNotification",
    send: (orderId) =>
      notification.sendOrderNotification(orderId, ORDER_STATUS.PAYMENT_COMPLETE),
  });

  const pharmCase = await runCase({
    label: "pharm_sendNewOrderNotification",
    send: (orderId) => notification.sendNewOrderNotification(orderId),
  });

  const riderCase = await runCase({
    label: "rider_sendRiderNotification",
    send: (orderId) => notification.sendRiderNotification(orderId),
  });

  const duplicateProbe = await runDuplicateProbe();

  const output = {
    mode:
      BENCH_CONFIG.dedupeEnabled && BENCH_CONFIG.deadCleanupEnabled
        ? "after_refactor"
        : "baseline_config",
    config: BENCH_CONFIG,
    runsPerCase: RUNS,
    simulatedPushDelayMs: PUSH_DELAY_MS,
    cases: [customerCase, pharmCase, riderCase],
    duplicateProbe,
    measuredAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    pushProbe.restore();
    try {
      await cleanupStaleBenchData();
    } catch (cleanupError) {
      console.error("[push-bench] cleanup failed", cleanupError);
    }
    await db.$disconnect();
  });
