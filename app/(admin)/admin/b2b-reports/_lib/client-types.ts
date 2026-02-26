import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";

export type AdminClientProps = { demoMode?: boolean };

export type EmployeeListItem = {
  id: string;
  name: string;
  birthDate: string;
  phoneNormalized: string;
  lastSyncedAt: string | null;
  counts: {
    healthSnapshots: number;
    reports: number;
  };
};

export type EmployeeDetail = {
  id: string;
  name: string;
  birthDate: string;
  lastSyncedAt: string | null;
  phoneNormalized?: string | null;
  [key: string]: unknown;
};

export type SurveyQuestion = {
  key: string;
  index: number;
  text: string;
  type: "text" | "single" | "multi";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  maxSelect?: number;
};

export type SurveyTemplateSchema = {
  common: SurveyQuestion[];
  sections: Array<{
    key: string;
    title: string;
    displayName?: string;
    questions: SurveyQuestion[];
  }>;
  sectionCatalog: Array<{
    key: string;
    title: string;
    displayName?: string;
  }>;
  rules?: { maxSelectedSections?: number };
};

export type ReportAudit = {
  selectedStage?: string | null;
  selectedStylePreset?: string | null;
  validation?: Array<{
    stylePreset?: string | null;
    stage: string;
    ok: boolean;
    issues?: LayoutValidationIssue[];
    runtimeIssueCount?: number;
    staticIssueCount?: number;
  }>;
};

export type ExportApiFailure = {
  ok?: false;
  error?: string;
  code?: string;
  reason?: string;
  debugId?: string;
  audit?: ReportAudit;
  issues?: LayoutValidationIssue[];
};

export type LatestReport = {
  id: string;
  status: string;
  periodKey?: string | null;
  payload?: ReportSummaryPayload;
  layoutDsl?: unknown;
  exportAudit?: ReportAudit | null;
  updatedAt: string;
};

export type CompletionStats = {
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
  percent: number;
};

export type SurveyAnswerRow = {
  questionKey: string;
  sectionKey?: string | null;
  answerText?: string | null;
  answerValue?: string | null;
  score?: number | null;
};

export type SurveyResponseRecord = {
  id: string;
  periodKey?: string | null;
  reportCycle?: string | null;
  selectedSections: string[];
  answersJson?: Record<string, unknown> | null;
  updatedAt?: string | null;
  answers?: SurveyAnswerRow[];
};

export type SurveyGetResponse = {
  ok: boolean;
  template: {
    id: string;
    version: string;
    title: string;
    schema: SurveyTemplateSchema;
  };
  response: SurveyResponseRecord | null;
  periodKey?: string;
  availablePeriods?: string[];
};

export type AnalysisSnapshot = {
  id: string;
  version: number;
  periodKey?: string | null;
  reportCycle?: string | null;
  payload?: Record<string, unknown> | null;
  computedAt?: string | null;
  updatedAt?: string | null;
};

export type AnalysisGetResponse = {
  ok: boolean;
  analysis: AnalysisSnapshot | null;
  periodKey?: string;
  availablePeriods?: string[];
};

export type NoteSnapshot = {
  id: string;
  note?: string | null;
  recommendations?: string | null;
  cautions?: string | null;
  createdByAdminTag?: string | null;
  periodKey?: string | null;
  reportCycle?: string | null;
  updatedAt?: string | null;
};

export type NoteGetResponse = {
  ok: boolean;
  note: NoteSnapshot | null;
};

export type ReportGetResponse = {
  ok: boolean;
  latest: LatestReport;
  reports: Array<{
    id: string;
    variantIndex: number;
    status: string;
    pageSize: string;
    stylePreset: string;
    periodKey?: string | null;
    reportCycle?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  availablePeriods: string[];
  periodKey: string;
};

export type EmployeeDetailGetResponse = {
  ok: boolean;
  employee: EmployeeDetail;
};
