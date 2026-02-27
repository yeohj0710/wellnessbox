import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  IdentityInput,
  SyncGuidance,
} from "./client-types";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";

const LS_KEY = "wb:b2b:employee:last-input:v2";
const IDENTITY_TTL_MS = 1000 * 60 * 60 * 24 * 30;

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

export function readStoredIdentity(): IdentityInput | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "null") as
      | {
          schemaVersion?: number;
          savedAt?: string;
          identity?: IdentityInput;
          name?: string;
          birthDate?: string;
          phone?: string;
        }
      | null;
    if (!parsed) return null;
    const savedAtMs = parsed.savedAt ? new Date(parsed.savedAt).getTime() : Date.now();
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > IDENTITY_TTL_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    const candidate = parsed.identity ?? {
      name: parsed.name || "",
      birthDate: parsed.birthDate || "",
      phone: parsed.phone || "",
    };
    if (!candidate.name || !candidate.birthDate || !candidate.phone) return null;
    return {
      name: candidate.name,
      birthDate: normalizeDigits(candidate.birthDate),
      phone: normalizeDigits(candidate.phone),
    };
  } catch {
    return null;
  }
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
}

export function clearStoredIdentity() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
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
      text: "최근 3건 복약 이력이 없습니다.",
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
