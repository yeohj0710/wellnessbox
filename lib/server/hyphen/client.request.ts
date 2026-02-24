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

export async function hyphenPost<TData = Record<string, unknown>>(
  endpoint: HyphenEndpointPath,
  body: HyphenNhisRequestPayload,
  options: HyphenRequestOptions = {}
): Promise<HyphenApiResponse<TData>> {
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
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${HYPHEN_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HyphenApiError({
        status: 504,
        endpoint,
        errCd: "HYPHEN_TIMEOUT",
        errMsg: `Hyphen API timed out after ${timeoutMs / 1000}s`,
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
      endpoint,
      errMsg: "Hyphen API returned invalid JSON",
      body: text,
    });
  }

  const common = normalizeCommon(payload);
  const hasCommonError = common.errYn === "Y";
  if (!response.ok || hasCommonError) {
    throw new HyphenApiError({
      status: response.status || 502,
      endpoint,
      errCd: common.errCd,
      errMsg: common.errMsg || `Hyphen endpoint ${endpoint} failed`,
      hyphenTrNo: common.hyphenTrNo,
      userTrNo: common.userTrNo,
      body: payload,
    });
  }

  return payload as HyphenApiResponse<TData>;
}
