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
import { requestJson } from "./client-utils";

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
  return requestJson<EmployeeSessionUpsertResponse>("/api/b2b/employee/session", {
    method: "POST",
    body: JSON.stringify(identity),
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
  return requestJson<EmployeeSyncResponse>("/api/b2b/employee/sync", {
    method: "POST",
    headers: input.debugOverride ? { "x-wb-force-refresh-debug": "1" } : undefined,
    body: JSON.stringify({
      ...input.identity,
      forceRefresh: input.forceRefresh,
    }),
  });
}

export async function requestNhisInit(input: {
  identity: IdentityInput;
  forceInit?: boolean;
}) {
  return requestJson<NhisInitResponse>("/api/health/nhis/init", {
    method: "POST",
    body: JSON.stringify({
      loginMethod: "EASY",
      loginOrgCd: "kakao",
      resNm: input.identity.name.trim(),
      resNo: input.identity.birthDate,
      mobileNo: input.identity.phone,
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
