import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  EmployeeSyncResponse,
  SyncGuidance,
} from "./client-types";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";

export function toSyncNextAction(
  value: SyncGuidance["nextAction"]
): "init" | "sign" | "retry" | null {
  if (value === "init" || value === "sign" || value === "retry") return value;
  return null;
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
  void input.forceRefresh;
  const source = normalizeSyncSource(input.sync?.source);
  const networkFetched = input.sync?.networkFetched === true || source === "fresh";
  const completionMessage =
    "건강정보 연동이 완료되었습니다. 이어서 설문을 진행해 주세요.";

  if (networkFetched) {
    return completionMessage;
  }

  if (source === "snapshot-history" || source === "cache-valid" || source === "cache-history") {
    return completionMessage;
  }

  if (input.authReused) {
    return completionMessage;
  }
  return completionMessage;
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
      text: "진료/조제 이력이 없습니다.",
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
  const reason = (payload.reason || "").trim().toLowerCase();
  if (nextAction === "init") {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction,
      message:
        payload.error ||
        "연동 초기화가 필요합니다. '카카오톡으로 인증 보내기'를 눌러 인증 요청을 시작해 주세요.",
    };
  }
  if (
    nextAction === "sign" ||
    reason === "nhis_sign_pending" ||
    reason === "nhis_sign_response_delayed"
  ) {
    return {
      code: payload.code,
      reason: payload.reason,
      nextAction: "sign",
      message:
        payload.error ||
        "카카오톡으로 인증을 보냈어요. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인' 버튼을 눌러 주세요.",
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

  return {
    code: payload.code,
    reason: payload.reason,
    nextAction: nextAction === "retry" ? "retry" : "retry",
    message: payload.error || fallbackMessage,
  };
}
