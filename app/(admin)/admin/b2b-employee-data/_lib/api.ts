import type {
  AdminEmployeeCreatePayload,
  AdminEmployeeDeletePayload,
  AdminEmployeeListResponse,
  AdminEmployeePatchPayload,
  DeleteRecordType,
  EmployeeOpsResponse,
} from "./client-types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "요청 처리 중 오류가 발생했습니다.");
  }
  return payload;
}

export async function fetchEmployees(query = "") {
  return requestJson<AdminEmployeeListResponse>(
    `/api/admin/b2b/employees${query ? `?q=${encodeURIComponent(query)}` : ""}`
  );
}

export async function createEmployee(input: AdminEmployeeCreatePayload) {
  return requestJson<{ ok: boolean; employee: { id: string } }>(
    "/api/admin/b2b/employees",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function fetchEmployeeOps(employeeId: string) {
  return requestJson<EmployeeOpsResponse>(`/api/admin/b2b/employees/${employeeId}/ops`);
}

export async function patchEmployee(
  employeeId: string,
  input: AdminEmployeePatchPayload
) {
  return requestJson<{ ok: boolean; employee: { id: string } }>(
    `/api/admin/b2b/employees/${employeeId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function deleteEmployee(
  employeeId: string,
  confirmName: AdminEmployeeDeletePayload["confirmName"]
) {
  return requestJson<{ ok: boolean; deleted: { employeeId: string; employeeName: string } }>(
    `/api/admin/b2b/employees/${employeeId}`,
    {
      method: "DELETE",
      body: JSON.stringify({ confirmName }),
    }
  );
}

export async function resetAllB2bData(input: {
  employeeId: string;
  includeAccessLogs?: boolean;
  includeAdminLogs?: boolean;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/ops`, {
    method: "POST",
    body: JSON.stringify({
      action: "reset_all_b2b_data",
      includeAccessLogs: input.includeAccessLogs,
      includeAdminLogs: input.includeAdminLogs,
    }),
  });
}

export async function resetPeriodData(input: {
  employeeId: string;
  periodKey: string;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/ops`, {
    method: "POST",
    body: JSON.stringify({
      action: "reset_period_data",
      periodKey: input.periodKey,
    }),
  });
}

export async function clearHyphenCache(input: {
  employeeId: string;
  clearLink?: boolean;
  clearFetchCache?: boolean;
  clearFetchAttempts?: boolean;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/ops`, {
    method: "POST",
    body: JSON.stringify({
      action: "clear_hyphen_cache",
      clearLink: input.clearLink,
      clearFetchCache: input.clearFetchCache,
      clearFetchAttempts: input.clearFetchAttempts,
    }),
  });
}

export async function deleteRecord(input: {
  employeeId: string;
  recordType: DeleteRecordType;
  recordId: string;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/ops`, {
    method: "POST",
    body: JSON.stringify({
      action: "delete_record",
      recordType: input.recordType,
      recordId: input.recordId,
    }),
  });
}
