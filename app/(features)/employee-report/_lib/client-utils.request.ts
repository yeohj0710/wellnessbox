import type { ApiErrorPayload } from "./client-types";

export class ApiRequestError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(
      payload.error || "요청 처리에 실패했습니다. '다시 시도'를 눌러 한 번 더 진행해 주세요."
    );
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
}

function resolveAbortSignal(input: {
  timeoutMs?: number;
  upstreamSignal?: AbortSignal | null;
}) {
  const timeoutMs =
    typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs)
      ? input.timeoutMs
      : 0;
  if (timeoutMs <= 0 && !input.upstreamSignal) {
    return {
      signal: undefined as AbortSignal | undefined,
      clear: () => undefined,
    };
  }

  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  let timeout: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs > 0) {
    timeout = setTimeout(onAbort, timeoutMs);
  }

  if (input.upstreamSignal) {
    if (input.upstreamSignal.aborted) {
      onAbort();
    } else {
      input.upstreamSignal.addEventListener("abort", onAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      if (timeout) clearTimeout(timeout);
      if (input.upstreamSignal) {
        input.upstreamSignal.removeEventListener("abort", onAbort);
      }
    },
  };
}

type RequestJsonOptions = {
  timeoutMs?: number;
  timeoutMessage?: string;
  networkErrorMessage?: string;
};

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
  options?: RequestJsonOptions
): Promise<T> {
  const timeoutMessage =
    options?.timeoutMessage ||
    "요청 시간이 길어 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const networkErrorMessage =
    options?.networkErrorMessage ||
    "네트워크 연결이 불안정합니다. 와이파이/모바일 데이터 상태를 확인한 뒤 다시 시도해 주세요.";

  const { signal, clear } = resolveAbortSignal({
    timeoutMs: options?.timeoutMs,
    upstreamSignal: init?.signal,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiRequestError(0, {
        code: "CLIENT_TIMEOUT",
        reason: "client_timeout",
        nextAction: "retry",
        error: timeoutMessage,
      });
    }
    throw new ApiRequestError(0, {
      code: "NETWORK_ERROR",
      reason: "network_unreachable",
      nextAction: "retry",
      error: networkErrorMessage,
    });
  } finally {
    clear();
  }

  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new ApiRequestError(response.status, data as ApiErrorPayload);
  }
  return data;
}
