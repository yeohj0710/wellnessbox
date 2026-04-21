import type {
  EmployeeReportResponse,
  EmployeeSessionGetResponse,
  EmployeeSessionUpsertResponse,
  EmployeeSyncResponse,
  IdentityInput,
  LoginStatusResponse,
  NhisInitResponse,
  NhisSignResponse,
  EmployeeWorkspaceResponse,
  EmployeeWorkspaceStartResponse,
} from "./client-types";
import { toIdentityPayload } from "./client-utils.identity";
import { requestJson } from "./client-utils.request";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const NHIS_INIT_TIMEOUT_MS = 45_000;
const NHIS_SIGN_TIMEOUT_MS = 45_000;
const EMPLOYEE_SYNC_TIMEOUT_MS = 210_000;

function buildEmployeeSyncHeaders(debugOverride?: boolean) {
  if (!debugOverride) return undefined;
  if (process.env.NODE_ENV === "production") return undefined;
  return { "x-wb-force-refresh-debug": "1" };
}

export async function fetchLoginStatus() {
  return requestJson<LoginStatusResponse>("/api/auth/login-status", undefined, {
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });
}

export async function fetchEmployeeReport(periodKey?: string) {
  const query = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
  return requestJson<EmployeeReportResponse>(`/api/b2b/employee/report${query}`, undefined, {
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });
}

export async function fetchEmployeeWorkspace(input?: {
  periodKey?: string;
  reportId?: string;
  driveSync?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (input?.periodKey) searchParams.set("period", input.periodKey);
  if (input?.reportId) searchParams.set("reportId", input.reportId);
  if (input?.driveSync) searchParams.set("driveSync", "1");
  const query = searchParams.toString();
  return requestJson<EmployeeWorkspaceResponse>(
    `/api/b2b/employee/workspace${query ? `?${query}` : ""}`,
    undefined,
    {
      timeoutMs: input?.driveSync ? 90_000 : DEFAULT_REQUEST_TIMEOUT_MS,
      timeoutMessage:
        "건강정보 연동 확인이 길어지고 있어요. 화면을 유지한 채 잠시 뒤 다시 확인해 주세요.",
    }
  );
}

export async function fetchEmployeeSession() {
  return requestJson<EmployeeSessionGetResponse>("/api/b2b/employee/session", undefined, {
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });
}

export async function upsertEmployeeSession(identity: IdentityInput) {
  const payload = toIdentityPayload(identity);
  return requestJson<EmployeeSessionUpsertResponse>(
    "/api/b2b/employee/session",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    }
  );
}

export async function deleteEmployeeSession() {
  return requestJson(
    "/api/b2b/employee/session",
    { method: "DELETE" },
    {
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    }
  );
}

export async function startEmployeeWorkspace(input: {
  identity: IdentityInput;
  periodKey?: string;
  restartHealth?: boolean;
}) {
  const payload = toIdentityPayload(input.identity);
  return requestJson<EmployeeWorkspaceStartResponse>(
    "/api/b2b/employee/workspace",
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        ...(input.periodKey ? { periodKey: input.periodKey } : {}),
        ...(input.restartHealth === true ? { restartHealth: true } : {}),
      }),
    },
    {
      timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    }
  );
}

export async function postEmployeeSync(input: {
  identity: IdentityInput;
  forceRefresh: boolean;
  debugOverride?: boolean;
}) {
  const payload = toIdentityPayload(input.identity);
  return requestJson<EmployeeSyncResponse>(
    "/api/b2b/employee/sync",
    {
      method: "POST",
      headers: buildEmployeeSyncHeaders(input.debugOverride),
      body: JSON.stringify({
        ...payload,
        forceRefresh: input.forceRefresh,
      }),
    },
    {
      timeoutMs: EMPLOYEE_SYNC_TIMEOUT_MS,
      timeoutMessage: "건강 정보 확인이 길어지고 있어요. 잠시 뒤 다시 시도해 주세요.",
    }
  );
}

export async function requestNhisInit(input: {
  identity: IdentityInput;
  forceInit?: boolean;
}) {
  const payload = toIdentityPayload(input.identity);
  return requestJson<NhisInitResponse>(
    "/api/health/nhis/init",
    {
      method: "POST",
      body: JSON.stringify({
        loginMethod: "EASY",
        loginOrgCd: "kakao",
        resNm: payload.name,
        resNo: payload.birthDate,
        mobileNo: payload.phone,
        ...(input.forceInit ? { forceInit: true } : {}),
      }),
    },
    {
      timeoutMs: NHIS_INIT_TIMEOUT_MS,
      timeoutMessage: "카카오톡 인증 준비가 길어지고 있어요. 잠시 뒤 다시 시도해 주세요.",
    }
  );
}

export async function requestNhisSign() {
  return requestJson<NhisSignResponse>(
    "/api/health/nhis/sign",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    {
      timeoutMs: NHIS_SIGN_TIMEOUT_MS,
      timeoutMessage: "카카오톡 인증 확인이 길어지고 있어요. 잠시 뒤 다시 시도해 주세요.",
    }
  );
}

export async function requestNhisUnlink() {
  return fetch("/api/health/nhis/unlink", { method: "POST" });
}
