import type {
  AdminEmployeeListResponse,
  EmployeeListItem as SharedEmployeeListItem,
} from "@/lib/b2b/admin-employee-management-contract";

export type AdminClientProps = { demoMode?: boolean };

export type B2bAdminReportPreviewTab = "integrated" | "report";

export type EmployeeListItem = SharedEmployeeListItem;

export type EmployeeListResponse = AdminEmployeeListResponse;

export type EmployeeDetail = EmployeeListItem;

export type CompletionStats = {
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  percent: number;
};

export type EmployeeDetailGetResponse = {
  ok: boolean;
  employee: EmployeeDetail;
};

export type {
  AnalysisMutationResponse,
  AnalysisGetResponse,
  AnalysisSnapshot,
  ExportApiFailure,
  LatestReport,
  NoteGetResponse,
  NotePutResponse,
  NoteSnapshot,
  MutationReportSummary,
  ReportAudit,
  ReportGetResponse,
  ReportPostResponse,
  ReportListItem,
  SurveyPutResponse,
  SurveySaveResult,
  SurveyAnswerRow,
  SurveyGetResponse,
  SurveyQuestion,
  SurveyResponseRecord,
  SurveyTemplateSchema,
  ValidationResponse,
} from "@/lib/b2b/admin-report-contract";
