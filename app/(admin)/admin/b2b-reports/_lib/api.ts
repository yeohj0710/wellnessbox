import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type {
  AnalysisGetResponse,
  EmployeeDetailGetResponse,
  EmployeeListItem,
  NoteGetResponse,
  ReportGetResponse,
  ReportAudit,
  SurveyGetResponse,
} from "./client-types";
import { requestJson } from "./client-utils";

export type EmployeeDetailBundle = {
  detail: EmployeeDetailGetResponse;
  survey: SurveyGetResponse;
  analysis: AnalysisGetResponse;
  note: NoteGetResponse;
  report: ReportGetResponse;
};

export type ValidationResponse = {
  ok: boolean;
  layout?: LayoutDocument;
  audit?: ReportAudit;
  issues?: LayoutValidationIssue[];
};

function toPeriodQuery(periodKey?: string) {
  return periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
}

export async function fetchEmployees(query = "") {
  return requestJson<{ ok: boolean; employees: EmployeeListItem[] }>(
    `/api/admin/b2b/employees${query ? `?q=${encodeURIComponent(query)}` : ""}`
  );
}

export async function fetchEmployeeDetailBundle(employeeId: string, periodKey?: string) {
  const periodQuery = toPeriodQuery(periodKey);
  const [detail, survey, analysis, note, report] = await Promise.all([
    requestJson<EmployeeDetailGetResponse>(`/api/admin/b2b/employees/${employeeId}`),
    requestJson<SurveyGetResponse>(`/api/admin/b2b/employees/${employeeId}/survey${periodQuery}`),
    requestJson<AnalysisGetResponse>(
      `/api/admin/b2b/employees/${employeeId}/analysis${periodQuery}`
    ),
    requestJson<NoteGetResponse>(`/api/admin/b2b/employees/${employeeId}/note${periodQuery}`),
    requestJson<ReportGetResponse>(`/api/admin/b2b/employees/${employeeId}/report${periodQuery}`),
  ]);
  return { detail, survey, analysis, note, report } satisfies EmployeeDetailBundle;
}

export async function saveSurvey(input: {
  employeeId: string;
  periodKey?: string;
  selectedSections: string[];
  answers: Record<string, unknown>;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/survey`, {
    method: "PUT",
    body: JSON.stringify({
      periodKey: input.periodKey,
      selectedSections: input.selectedSections,
      answers: input.answers,
    }),
  });
}

export async function saveAnalysisPayload(input: {
  employeeId: string;
  periodKey?: string;
  payload: unknown;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/analysis`, {
    method: "PUT",
    body: JSON.stringify({
      periodKey: input.periodKey,
      payload: input.payload,
    }),
  });
}

export async function saveNote(input: {
  employeeId: string;
  periodKey?: string;
  note: string;
  recommendations: string;
  cautions: string;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/note`, {
    method: "PUT",
    body: JSON.stringify({
      periodKey: input.periodKey,
      note: input.note,
      recommendations: input.recommendations,
      cautions: input.cautions,
      actorTag: "admin",
    }),
  });
}

export async function recomputeAnalysis(input: {
  employeeId: string;
  periodKey?: string;
  generateAiEvaluation: boolean;
}) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/analysis`, {
    method: "POST",
    body: JSON.stringify({
      periodKey: input.periodKey,
      generateAiEvaluation: input.generateAiEvaluation,
      forceAiRegenerate: input.generateAiEvaluation,
      replaceLatestPeriodEntry: true,
    }),
  });
}

export async function regenerateReport(input: { employeeId: string; periodKey?: string }) {
  return requestJson(`/api/admin/b2b/employees/${input.employeeId}/report`, {
    method: "POST",
    body: JSON.stringify({
      regenerate: true,
      pageSize: "A4",
      periodKey: input.periodKey,
    }),
  });
}

export async function saveReportDisplayPeriod(input: {
  reportId: string;
  displayPeriodKey: string;
}) {
  return requestJson(`/api/admin/b2b/reports/${input.reportId}/meta`, {
    method: "PATCH",
    body: JSON.stringify({
      displayPeriodKey: input.displayPeriodKey,
    }),
  });
}

export async function runLayoutValidation(reportId: string) {
  return requestJson<ValidationResponse>(`/api/admin/b2b/reports/${reportId}/validation`);
}

export async function seedDemoEmployees() {
  return requestJson<{ ok: boolean; employeeIds: string[] }>("/api/admin/b2b/demo/seed", {
    method: "POST",
  });
}
