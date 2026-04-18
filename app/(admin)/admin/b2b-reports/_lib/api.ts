import type {
  AnalysisMutationResponse,
  AnalysisGetResponse,
  EmployeeListResponse,
  LatestReport,
  ReportGetResponse,
  ReportPostResponse,
  SurveyGetResponse,
  SurveyPutResponse,
  ValidationResponse,
} from "./client-types";
import type { B2bReportPackagedProduct } from "@/lib/b2b/report-customization-types";
import { runWithRetry } from "@/lib/client/fetch-utils";
import { requestJson } from "./client-utils";

export type EmployeeDetailBundle = {
  survey: SurveyGetResponse;
  analysis: AnalysisGetResponse;
  report: ReportGetResponse | null;
  reportError: Error | null;
};

function toPeriodQuery(periodKey?: string) {
  return periodKey ? `?period=${encodeURIComponent(periodKey)}` : "";
}

export async function fetchEmployees(query = "") {
  const params = new URLSearchParams({ view: "reports" });
  if (query) params.set("q", query);
  return requestJson<EmployeeListResponse>(
    `/api/admin/b2b/employees?${params.toString()}`
  );
}

export async function fetchEmployeeDetailBundle(employeeId: string, periodKey?: string) {
  const periodQuery = toPeriodQuery(periodKey);
  const [survey, analysis, reportResult] = await Promise.all([
    requestJson<SurveyGetResponse>(`/api/admin/b2b/employees/${employeeId}/survey${periodQuery}`),
    requestJson<AnalysisGetResponse>(
      `/api/admin/b2b/employees/${employeeId}/analysis${periodQuery}`
    ),
    runWithRetry(
      () =>
        requestJson<ReportGetResponse>(
          `/api/admin/b2b/employees/${employeeId}/report${periodQuery}`
        ),
      {
        retries: 2,
        baseDelayMs: 300,
        maxDelayMs: 1200,
      }
    )
      .then((report) => ({ report, error: null }))
      .catch((error: unknown) => ({
        report: null,
        error: error instanceof Error ? error : new Error("리포트 조회에 실패했습니다."),
      })),
  ]);
  return {
    survey,
    analysis,
    report: reportResult.report,
    reportError: reportResult.error,
  } satisfies EmployeeDetailBundle;
}

export async function saveSurvey(input: {
  employeeId: string;
  periodKey?: string;
  selectedSections: string[];
  answers: Record<string, unknown>;
}) {
  return requestJson<SurveyPutResponse>(
    `/api/admin/b2b/employees/${input.employeeId}/survey`,
    {
      method: "PUT",
      body: JSON.stringify({
        periodKey: input.periodKey,
        selectedSections: input.selectedSections,
        answers: input.answers,
      }),
    }
  );
}

export async function saveAnalysisPayload(input: {
  employeeId: string;
  periodKey?: string;
  payload: unknown;
}) {
  return requestJson<AnalysisMutationResponse>(
    `/api/admin/b2b/employees/${input.employeeId}/analysis`,
    {
      method: "PUT",
      body: JSON.stringify({
        periodKey: input.periodKey,
        payload: input.payload,
      }),
    }
  );
}

export async function recomputeAnalysis(input: {
  employeeId: string;
  periodKey?: string;
  generateAiEvaluation: boolean;
}) {
  return requestJson<AnalysisMutationResponse>(
    `/api/admin/b2b/employees/${input.employeeId}/analysis`,
    {
      method: "POST",
      body: JSON.stringify({
        periodKey: input.periodKey,
        generateAiEvaluation: input.generateAiEvaluation,
        forceAiRegenerate: input.generateAiEvaluation,
        replaceLatestPeriodEntry: true,
      }),
    }
  );
}

export async function regenerateReport(input: { employeeId: string; periodKey?: string }) {
  return requestJson<ReportPostResponse>(
    `/api/admin/b2b/employees/${input.employeeId}/report`,
    {
      method: "POST",
      body: JSON.stringify({
        regenerate: true,
        pageSize: "A4",
        periodKey: input.periodKey,
      }),
    }
  );
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

export async function saveReportCustomization(input: {
  reportId: string;
  consultationSummary: string;
  packagedProducts: B2bReportPackagedProduct[];
}) {
  return requestJson<{ ok: boolean; report: LatestReport }>(
    `/api/admin/b2b/reports/${input.reportId}/meta`,
    {
      method: "PATCH",
      body: JSON.stringify({
        consultationSummary: input.consultationSummary,
        packagedProducts: input.packagedProducts,
      }),
    }
  );
}

export async function runLayoutValidation(reportId: string) {
  return requestJson<ValidationResponse>(`/api/admin/b2b/reports/${reportId}/validation`);
}

export async function seedDemoEmployees() {
  return requestJson<{ ok: boolean; employeeIds: string[] }>("/api/admin/b2b/demo/seed", {
    method: "POST",
  });
}
