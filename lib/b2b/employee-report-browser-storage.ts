export const EMPLOYEE_REPORT_IDENTITY_STORAGE_KEY =
  "wb:b2b:employee:last-input:v2";

export const EMPLOYEE_REPORT_LEGACY_IDENTITY_STORAGE_KEYS = [
  "wb:b2b:employee:last-input:v1",
  "wb:b2b:employee:last-input",
  "wb:b2b:survey:identity:v1",
] as const;

export const EMPLOYEE_REPORT_SURVEY_STORAGE_KEY = "b2b-public-survey-state.v4";

export const EMPLOYEE_REPORT_RESET_EVENT_KEY =
  "wb:b2b:employee:reset-event:v1";

export type EmployeeReportResetReason = "admin-delete" | "manual-reset";

export function clearEmployeeReportIdentityStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMPLOYEE_REPORT_IDENTITY_STORAGE_KEY);
  for (const key of EMPLOYEE_REPORT_LEGACY_IDENTITY_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function clearEmployeeReportBrowserStorage() {
  if (typeof window === "undefined") return;
  clearEmployeeReportIdentityStorage();
  window.localStorage.removeItem(EMPLOYEE_REPORT_SURVEY_STORAGE_KEY);
}

export function broadcastEmployeeReportReset(reason: EmployeeReportResetReason) {
  if (typeof window === "undefined") return;
  clearEmployeeReportBrowserStorage();
  window.localStorage.setItem(
    EMPLOYEE_REPORT_RESET_EVENT_KEY,
    JSON.stringify({
      reason,
      sentAt: new Date().toISOString(),
    })
  );
  window.localStorage.removeItem(EMPLOYEE_REPORT_RESET_EVENT_KEY);
}
