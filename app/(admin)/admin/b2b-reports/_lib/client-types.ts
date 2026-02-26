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
  helpText?: string;
  type: "text" | "single" | "multi" | "number" | "group";
  sourceType?:
    | "single_choice"
    | "multi_select_with_none"
    | "multi_select_limited"
    | "number"
    | "group";
  required?: boolean;
  options?: Array<{
    value: string;
    label: string;
    score?: number;
    aliases?: string[];
    isNoneOption?: boolean;
  }>;
  placeholder?: string;
  maxSelect?: number;
  optionsPrefix?: string;
  unit?: string;
  fields?: Array<{
    id: string;
    label: string;
    type: "text" | "number";
    unit?: string;
    constraints?: {
      min?: number;
      max?: number;
      integer?: boolean;
    };
  }>;
  displayIf?: {
    field: string;
    equals: string;
  };
  noneOptionValue?: string;
  variants?: Record<
    string,
    {
      variantId?: string;
      optionsPrefix?: string;
      options?: Array<{ value: string; label: string; score?: number }>;
    }
  >;
  constraints?: {
    min?: number;
    max?: number;
    integer?: boolean;
    maxSelections?: number;
    recommendedSelectionsRange?: [number, number];
  };
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
  rules?: {
    maxSelectedSections?: number;
    recommendedSelectionsRange?: [number, number];
  };
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
  meta?: Record<string, unknown> | null;
};

export type SurveyResponseRecord = {
  id: string;
  periodKey?: string | null;
  reportCycle?: number | null;
  selectedSections: string[];
  answersJson?: Record<string, unknown> | null;
  updatedAt?: string | null;
  answers?: SurveyAnswerRow[];
};

export type SurveyGetResponse = {
  ok: boolean;
  template: {
    id: string;
    version: number;
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
