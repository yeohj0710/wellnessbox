import {
  PushFailureType,
  SubscriptionRecord,
} from "@/lib/notification/core.types";

const DEFAULT_PUSH_CONCURRENCY = 8;
const MAX_PUSH_CONCURRENCY = 32;
const DEFAULT_PUSH_RETRY_COUNT = 1;
const MAX_PUSH_RETRY_COUNT = 3;

export type PushFanoutRuntimeConfig = {
  concurrency: number;
  retryCount: number;
  dedupeEnabled: boolean;
  deadCleanupEnabled: boolean;
};

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function readNonNegativeInt(
  value: string | undefined,
  fallback: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function resolvePushConcurrency() {
  return readPositiveInt(
    process.env.WB_PUSH_SEND_CONCURRENCY,
    DEFAULT_PUSH_CONCURRENCY,
    MAX_PUSH_CONCURRENCY
  );
}

function resolvePushRetryCount() {
  return readNonNegativeInt(
    process.env.WB_PUSH_SEND_RETRIES,
    DEFAULT_PUSH_RETRY_COUNT,
    MAX_PUSH_RETRY_COUNT
  );
}

function isPushDedupeEnabled() {
  return process.env.WB_PUSH_ENABLE_DEDUPE !== "0";
}

function shouldCleanDeadSubscriptions() {
  return process.env.WB_PUSH_CLEAN_DEAD !== "0";
}

export function resolvePushFanoutRuntimeConfig(): PushFanoutRuntimeConfig {
  return {
    concurrency: resolvePushConcurrency(),
    retryCount: resolvePushRetryCount(),
    dedupeEnabled: isPushDedupeEnabled(),
    deadCleanupEnabled: shouldCleanDeadSubscriptions(),
  };
}

export function dedupeSubscriptionsByEndpoint(subscriptions: SubscriptionRecord[]) {
  const unique = new Map<string, SubscriptionRecord>();
  for (const subscription of subscriptions) {
    if (!subscription.endpoint || unique.has(subscription.endpoint)) continue;
    unique.set(subscription.endpoint, subscription);
  }
  return Array.from(unique.values());
}

export function addFailureCount(
  failureByType: Record<string, number>,
  failureType: PushFailureType
) {
  failureByType[failureType] = (failureByType[failureType] ?? 0) + 1;
}

export async function waitForRetry(ms: number) {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];
  const size = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let index = 0;

  async function runWorker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      try {
        const value = await worker(items[current], current);
        results[current] = { status: "fulfilled", value };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: size }, () => runWorker()));
  return results;
}

export function countDeadEndpointGroups(deadByStatus: Map<number, Set<string>>) {
  return Array.from(deadByStatus.values()).reduce(
    (count, endpointSet) => count + endpointSet.size,
    0
  );
}
