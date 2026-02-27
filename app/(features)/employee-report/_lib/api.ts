import type {
  EmployeeReportResponse,
  EmployeeSessionGetResponse,
  EmployeeSessionUpsertResponse,
  EmployeeSyncResponse,
  IdentityInput,
  LoginStatusResponse,
  NhisInitResponse,
  NhisSignResponse,
} from "./client-types";
import { requestJson, toIdentityPayload } from "./client-utils";

function buildEmployeeSyncHeaders(debugOverride?: boolean) {
  if (!debugOverride) return undefined;
  if (process.env.NODE_ENV === "production") return undefined;
  return { "x-wb-force-refresh-debug": "1" };
}

export async function fetchLoginStatus() {
  return requestJson<LoginStatusResponse>("/api/auth/login-status");
}

export async function fetchEmployeeReport(periodKey?: string) {
  const query = periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
  return requestJson<EmployeeReportResponse>(`/api/b2b/employee/report${query}`);
}

export async function fetchEmployeeSession() {
  return requestJson<EmployeeSessionGetResponse>("/api/b2b/employee/session");
}

export async function upsertEmployeeSession(identity: IdentityInput) {
  const payload = toIdentityPayload(identity);
  return requestJson<EmployeeSessionUpsertResponse>("/api/b2b/employee/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployeeSession() {
  return requestJson("/api/b2b/employee/session", { method: "DELETE" });
}

export async function postEmployeeSync(input: {
  identity: IdentityInput;
  forceRefresh: boolean;
  debugOverride?: boolean;
}) {
  const payload = toIdentityPayload(input.identity);
  return requestJson<EmployeeSyncResponse>("/api/b2b/employee/sync", {
    method: "POST",
    headers: buildEmployeeSyncHeaders(input.debugOverride),
    body: JSON.stringify({
      ...payload,
      forceRefresh: input.forceRefresh,
    }),
  });
}

export async function requestNhisInit(input: {
  identity: IdentityInput;
  forceInit?: boolean;
}) {
  const payload = toIdentityPayload(input.identity);
  return requestJson<NhisInitResponse>("/api/health/nhis/init", {
    method: "POST",
    body: JSON.stringify({
      loginMethod: "EASY",
      loginOrgCd: "kakao",
      resNm: payload.name,
      resNo: payload.birthDate,
      mobileNo: payload.phone,
      ...(input.forceInit ? { forceInit: true } : {}),
    }),
  });
}

export async function requestNhisSign() {
  return requestJson<NhisSignResponse>("/api/health/nhis/sign", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function requestNhisUnlink() {
  return fetch("/api/health/nhis/unlink", { method: "POST" });
}
