import type {
  ApiErrorPayload,
  EmployeeSyncResponse,
  EmployeeReportResponse,
  IdentityInput,
  SyncGuidance,
} from "./client-types";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";

const LS_KEY = "wb:b2b:employee:last-input:v2";
const LEGACY_LS_KEYS = [
  "wb:b2b:employee:last-input:v1",
  "wb:b2b:employee:last-input",
] as const;
const IDENTITY_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type StoredIdentitySource =
  | "none"
  | "v2"
  | "legacy"
  | "expired"
  | "invalid";

type StoredIdentityCandidate = {
  schemaVersion?: number;
  savedAt?: string;
  identity?: IdentityInput;
  name?: string;
  birthDate?: string;
  phone?: string;
};

export type ParsedStoredIdentityResult = {
  source: StoredIdentitySource;
  identity: IdentityInput | null;
  shouldClear: boolean;
};

type StoredIdentityReadResult = {
  source: StoredIdentitySource;
  identity: IdentityInput | null;
};

export function toSyncNextAction(
  value: SyncGuidance["nextAction"]
): "init" | "sign" | "retry" | null {
  if (value === "init" || value === "sign" || value === "retry") return value;
  return null;
}

export class ApiRequestError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error || "요청 처리에 실패했습니다.");
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

type EmployeeSyncSource =
  | "fresh"
  | "cache-valid"
  | "cache-history"
  | "snapshot-history"
  | undefined;

function normalizeSyncSource(source: EmployeeSyncSource) {
  if (
    source === "fresh" ||
    source === "cache-valid" ||
    source === "cache-history" ||
    source === "snapshot-history"
  ) {
    return source;
  }
  return undefined;
}

export function resolveSyncCompletionNotice(input: {
  sync: EmployeeSyncResponse["sync"] | undefined;
  forceRefresh: boolean;
  authReused: boolean;
}) {
  const source = normalizeSyncSource(input.sync?.source);
  const networkFetched = input.sync?.networkFetched === true || source === "fresh";

  if (networkFetched) {
    return input.forceRefresh
      ? "최신 건강정보를 다시 불러왔습니다."
      : "최신 건강정보를 불러왔습니다.";
  }

  if (source === "snapshot-history" || source === "cache-valid" || source === "cache-history") {
    return "저장된 건강정보를 반영했습니다.";
  }

  if (input.authReused) return "저장된 인증 상태를 확인했습니다.";
  return "건강정보를 갱신했습니다.";
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function toIdentityPayload(identity: IdentityInput): IdentityInput {
  return {
    name: identity.name.trim(),
    birthDate: normalizeDigits(identity.birthDate),
    phone: normalizeDigits(identity.phone),
  };
}

export function isValidIdentityInput(identity: IdentityInput) {
  const normalized = toIdentityPayload(identity);
  return (
    normalized.name.length > 0 &&
    /^\d{8}$/.test(normalized.birthDate) &&
    /^\d{10,11}$/.test(normalized.phone)
  );
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function isStoredIdentityCandidate(
  value: unknown
): value is StoredIdentityCandidate {
  return typeof value === "object" && value !== null;
}

export function parseStoredIdentitySnapshot(
  raw: string | null | undefined,
  nowMs = Date.now()
): ParsedStoredIdentityResult {
  if (!raw) {
    return {
      source: "none",
      identity: null,
      shouldClear: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredIdentityCandidate(parsed)) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    const savedAtMs = parsed.savedAt ? new Date(parsed.savedAt).getTime() : nowMs;
    if (!Number.isFinite(savedAtMs) || nowMs - savedAtMs > IDENTITY_TTL_MS) {
      return {
        source: "expired",
        identity: null,
        shouldClear: true,
      };
    }

    const candidate = parsed.identity ?? {
      name: parsed.name || "",
      birthDate: parsed.birthDate || "",
      phone: parsed.phone || "",
    };

    if (!candidate.name || !candidate.birthDate || !candidate.phone) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    const identity = {
      name: candidate.name,
      birthDate: normalizeDigits(candidate.birthDate),
      phone: normalizeDigits(candidate.phone),
    };

    if (
      identity.name.length < 1 ||
      !/^\d{8}$/.test(identity.birthDate) ||
      !/^\d{10,11}$/.test(identity.phone)
    ) {
      return {
        source: "invalid",
        identity: null,
        shouldClear: true,
      };
    }

    return {
      source: parsed.schemaVersion === 2 ? "v2" : "legacy",
      identity,
      shouldClear: false,
    };
  } catch {
    return {
      source: "invalid",
      identity: null,
      shouldClear: true,
    };
  }
}

export function readStoredIdentityWithSource(): StoredIdentityReadResult {
  if (typeof window === "undefined") {
    return {
      source: "none",
      identity: null,
    };
  }

  const keys = [LS_KEY, ...LEGACY_LS_KEYS];
  let fallbackSource: StoredIdentitySource = "none";

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    const parsed = parseStoredIdentitySnapshot(raw, Date.now());
    if (parsed.shouldClear) {
      window.localStorage.removeItem(key);
    }
    if (parsed.identity) {
      // Canonicalize to v2 key and purge legacy keys when a valid identity is restored.
      if (key !== LS_KEY) {
        saveStoredIdentity(parsed.identity);
      }
      return {
        source: parsed.source,
        identity: parsed.identity,
      };
    }
    if (fallbackSource === "none" && parsed.source !== "none") {
      fallbackSource = parsed.source;
    }
  }

  return {
    source: fallbackSource,
    identity: null,
  };
}

export function readStoredIdentity(): IdentityInput | null {
  return readStoredIdentityWithSource().identity;
}

export function resolveIdentityPrimaryActionLabel(input: {
  hasAuthAttempt: boolean;
  syncNextAction: "init" | "sign" | "retry" | null;
  storedIdentitySource: StoredIdentitySource;
}) {
  if (input.syncNextAction === "init" || input.syncNextAction === "retry" || input.hasAuthAttempt) {
    return "인증/연동 다시 진행";
  }
  if (input.syncNextAction === "sign") return "인증 상태 확인";
  if (input.storedIdentitySource === "v2" || input.storedIdentitySource === "legacy") {
    return "인증/연동 진행";
  }
  return "인증/연동 시작";
}

export function saveStoredIdentity(identity: IdentityInput) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      identity,
    })
  );
  for (const key of LEGACY_LS_KEYS) {
    localStorage.removeItem(key);
  }
}

export function clearStoredIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
  for (const key of LEGACY_LS_KEYS) {
    localStorage.removeItem(key);
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

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = header.match(
    /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i
  );
  const encoded = match?.[1] || match?.[2];
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export async function downloadPdf(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "PDF 다운로드에 실패했습니다.");
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    fallbackName
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "방금";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "방금";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return "어제";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export function resolveCooldownUntilFromPayload(payload: ApiErrorPayload) {
  const availableAt = payload.availableAt || payload.cooldown?.availableAt;
  if (availableAt) {
    const parsed = new Date(availableAt).getTime();
    if (Number.isFinite(parsed) && parsed > Date.now()) return parsed;
  }
  const retryAfter = payload.retryAfterSec ?? payload.cooldown?.remainingSeconds;
  if (typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0) {
    return Date.now() + retryAfter * 1000;
  }
  return null;
}

export function resolveMedicationStatusMessage(reportData: EmployeeReportResponse | null) {
  const status = reportData?.report?.payload?.health?.medicationStatus;
  if (!status) return null;
  if (status.type === "available" && status.message) {
    return {
      tone: "warn" as const,
      text: status.message,
    };
  }
  if (status.type === "fetch_failed") {
    return {
      tone: "error" as const,
      text:
        status.message ||
        "복약 데이터를 가져오지 못했습니다. 잠시 후 다시 연동해 주세요.",
    };
  }
  if (status.type === "none") {
    return {
      tone: "warn" as const,
      text: "최근 3건 진료/조제 이력이 없습니다.",
    };
  }
  if (status.type === "unknown") {
    return {
      tone: "warn" as const,
      text:
        status.message ||
        "복약 상태를 확정할 수 없습니다. 최신 정보 다시 연동을 시도해 주세요.",
    };
  }
  return null;
}

export function parseLayoutDsl(raw: unknown): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as LayoutDocument;
  if (!Array.isArray(layout.pages) || layout.pages.length === 0) return null;
  if (!layout.pageSizeMm || typeof layout.pageSizeMm.width !== "number") return null;
  if (typeof layout.pageSizeMm.height !== "number") return null;
  return layout;
}

export function buildSyncGuidance(
  payload: ApiErrorPayload,
  status: number,
  fallbackMessage: string
): SyncGuidance {
  if (payload.code === "NETWORK_ERROR") {
    return {
      code: payload.code,
      reason: payload.reason || "network_unreachable",
      nextAction: "retry",
      message:
        payload.error ||
        "네트워크 연결이 불안정합니다. 와이파이/모바일 데이터 상태를 확인한 뒤 다시 시도해 주세요.",
    };
  }

  if (payload.code === "CLIENT_TIMEOUT") {
    return {
      code: payload.code,
      reason: payload.reason || "client_timeout",
      nextAction: "retry",
      message:
        payload.error ||
        "응답 시간이 길어 요청이 중단되었습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (status === 524 || status === 504) {
    return {
      code: payload.code,
      reason: payload.reason || "upstream_timeout",
      nextAction: "retry",
      message:
        payload.error ||
        "외부 건강데이터 연동 응답이 지연되어 시간 초과가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (payload.code === "DB_SCHEMA_MISMATCH") {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction: "retry",
      message:
        "서버 데이터베이스 점검이 필요한 상태입니다. 잠시 후 다시 시도하거나 운영팀에 문의해 주세요.",
    };
  }

  if (payload.code === "DB_POOL_TIMEOUT") {
    return {
      code: payload.code,
      reason: payload.reason || "db_pool_busy",
      nextAction: "wait",
      retryAfterSec: payload.retryAfterSec ?? 20,
      availableAt: payload.availableAt ?? null,
      message:
        payload.error ||
        "요청이 몰려 DB 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const nextAction = payload.nextAction;
  if (nextAction === "init") {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction,
      message:
        "연동 초기화가 필요합니다. 인증 다시하기를 눌러 카카오 인증을 시작해 주세요.",
    };
  }
  if (nextAction === "sign") {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction,
      message: "카카오 인증 확인 대기 중입니다. 확인 후 '연동 완료 확인'을 눌러 주세요.",
    };
  }
  if (nextAction === "wait" || status === 429) {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction: "wait",
      retryAfterSec: payload.retryAfterSec ?? payload.cooldown?.remainingSeconds,
      availableAt: payload.availableAt ?? payload.cooldown?.availableAt ?? null,
      message: "재연동 대기 시간이 남아 있습니다. 안내된 시각 이후 다시 시도해 주세요.",
    };
  }
  return {
    code: payload.code,
    reason: payload.reason,
    nextAction: nextAction === "retry" ? "retry" : "retry",
    message: payload.error || fallbackMessage,
  };
}
