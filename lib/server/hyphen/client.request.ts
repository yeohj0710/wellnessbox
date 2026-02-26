import "server-only";

import {
  HYPHEN_BASE_URL,
  type HyphenApiResponse,
  type HyphenEndpointPath,
  type HyphenNhisRequestPayload,
  type HyphenRequestOptions,
} from "./client.contracts";
import {
  normalizeCommon,
  resolveHyphenAuthHeaders,
  resolveHyphenTimeoutMs,
  shouldUseGustationHeader,
} from "./client.runtime";
import {
  isHyphenMockModeEnabled,
  resolveHyphenMockResponse,
} from "./client.mock";

export class HyphenApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly errCd?: string;
  readonly errMsg?: string;
  readonly hyphenTrNo?: string;
  readonly userTrNo?: string;
  readonly body?: unknown;

  constructor(options: {
    status: number;
    endpoint: string;
    errCd?: string;
    errMsg?: string;
    hyphenTrNo?: string;
    userTrNo?: string;
    body?: unknown;
  }) {
    super(options.errMsg || "Hyphen API request failed");
    this.name = "HyphenApiError";
    this.status = options.status;
    this.endpoint = options.endpoint;
    this.errCd = options.errCd;
    this.errMsg = options.errMsg;
    this.hyphenTrNo = options.hyphenTrNo;
    this.userTrNo = options.userTrNo;
    this.body = options.body;
  }
}

export function isHyphenApiError(error: unknown): error is HyphenApiError {
  return error instanceof HyphenApiError;
}

const TRANSIENT_HYPHEN_ERROR_CODES = new Set([
  "HYPHEN_TIMEOUT",
  "HYF-0002",
  "HYF-9999",
]);

function envInt(name: string, fallback: number, min = 0, max = 10) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function resolveHyphenMaxRetries() {
  return envInt("HYPHEN_HTTP_MAX_RETRIES", 1, 0, 4);
}

function resolveHyphenRetryBaseDelayMs() {
  return envInt("HYPHEN_HTTP_RETRY_BASE_DELAY_MS", 700, 200, 5000);
}

function shouldRetryHyphenError(error: unknown) {
  if (error instanceof HyphenApiError) {
    if (error.status === 429) return true;
    if (error.status >= 500) return true;
    if (error.errCd && TRANSIENT_HYPHEN_ERROR_CODES.has(error.errCd)) return true;
    return false;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (/fetch failed/i.test(error.message)) return true;
    if (/network/i.test(error.message)) return true;
  }

  return false;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRetryDelayMs(attempt: number) {
  const base = resolveHyphenRetryBaseDelayMs();
  return Math.min(6_000, base * Math.pow(2, attempt));
}

async function hyphenPostOnce<TData = Record<string, unknown>>(input: {
  endpoint: HyphenEndpointPath;
  body: HyphenNhisRequestPayload;
  headers: Headers;
  timeoutMs: number;
}): Promise<HyphenApiResponse<TData>> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), input.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${HYPHEN_BASE_URL}${input.endpoint}`, {
      method: "POST",
      headers: input.headers,
      cache: "no-store",
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HyphenApiError({
        status: 504,
        endpoint: input.endpoint,
        errCd: "HYPHEN_TIMEOUT",
        errMsg: `Hyphen API timed out after ${input.timeoutMs / 1000}s`,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new HyphenApiError({
      status: response.status || 502,
      endpoint: input.endpoint,
      errMsg: "Hyphen API returned invalid JSON",
      body: text,
    });
  }

  const common = normalizeCommon(payload);
  const hasCommonError = common.errYn === "Y";
  if (!response.ok || hasCommonError) {
    throw new HyphenApiError({
      status: response.status || 502,
      endpoint: input.endpoint,
      errCd: common.errCd,
      errMsg: common.errMsg || `Hyphen endpoint ${input.endpoint} failed`,
      hyphenTrNo: common.hyphenTrNo,
      userTrNo: common.userTrNo,
      body: payload,
    });
  }

  return payload as HyphenApiResponse<TData>;
}

export async function hyphenPost<TData = Record<string, unknown>>(
  endpoint: HyphenEndpointPath,
  body: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
): Promise<HyphenApiResponse<TData>> {
  if (isHyphenMockModeEnabled()) {
    return resolveHyphenMockResponse(endpoint, body) as HyphenApiResponse<TData>;
  }

  const authHeaders = resolveHyphenAuthHeaders();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...authHeaders,
  });

  if (shouldUseGustationHeader()) {
    headers.set("Hyphen-Gustation", "Y");
  }
  if (options.userTrNo) {
    headers.set("user-tr-no", options.userTrNo);
  }

  const timeoutMs = resolveHyphenTimeoutMs();
  const maxRetries = resolveHyphenMaxRetries();
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await hyphenPostOnce<TData>({ endpoint, body, headers, timeoutMs });
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !shouldRetryHyphenError(error)) {
        throw error;
      }
      await sleep(resolveRetryDelayMs(attempt));
    }
    attempt += 1;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Hyphen request failed after retries");
}
