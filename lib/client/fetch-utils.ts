type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

type FetchJsonOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

function clampPositiveInt(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  if (value <= 0) return fallback;
  return Math.floor(value);
}

function clampNonNegativeInt(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return fallback;
  return Math.floor(value);
}

function createTimeoutSignal(timeoutMs: number, upstream?: AbortSignal) {
  const controller = new AbortController();
  const safeTimeoutMs = clampPositiveInt(timeoutMs, 8000);

  const onUpstreamAbort = () => {
    controller.abort(upstream?.reason);
  };

  if (upstream) {
    if (upstream.aborted) {
      controller.abort(upstream.reason);
    } else {
      upstream.addEventListener("abort", onUpstreamAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException("Timed out", "TimeoutError"));
  }, safeTimeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (upstream) {
        upstream.removeEventListener("abort", onUpstreamAbort);
      }
    },
  };
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchJsonOptions = {}
): Promise<{ response: Response; payload: T | null; rawText: string }> {
  const { timeoutMs = 8000, signal } = options;
  const { signal: timeoutSignal, cleanup } = createTimeoutSignal(
    timeoutMs,
    signal
  );

  try {
    const response = await fetch(input, {
      ...init,
      signal: timeoutSignal,
    });
    const rawText = await response.text();
    let payload: T | null = null;
    if (rawText) {
      payload = JSON.parse(rawText) as T;
    }
    return { response, payload, rawText };
  } catch (error) {
    if (isAbortError(error) && !signal?.aborted) {
      throw new FetchTimeoutError(
        `Request timed out after ${clampPositiveInt(timeoutMs, 8000)}ms`
      );
    }
    throw error;
  } finally {
    cleanup();
  }
}

export async function runWithRetry<T>(
  work: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = clampNonNegativeInt(options.retries ?? 2, 2);
  const baseDelayMs = clampPositiveInt(options.baseDelayMs ?? 600, 600);
  const maxDelayMs = clampPositiveInt(options.maxDelayMs ?? 6000, 6000);
  const shouldRetry = options.shouldRetry ?? (() => true);
  const signal = options.signal;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    try {
      return await work(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error, attempt)) {
        break;
      }
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitteredDelay = Math.min(
        maxDelayMs,
        Math.round(exponentialDelay * (0.9 + Math.random() * 0.2))
      );
      await wait(jitteredDelay, signal);
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Retry attempts exhausted");
}
