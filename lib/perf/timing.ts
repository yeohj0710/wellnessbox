import { performance } from "node:perf_hooks";

const shouldLogServerTiming = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.WB_PERF_LOGGING === "1";

export async function measureServerTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    if (shouldLogServerTiming()) {
      const elapsedMs = performance.now() - startedAt;
      console.info(`[perf] ${label}: ${elapsedMs.toFixed(1)}ms`);
    }
  }
}
