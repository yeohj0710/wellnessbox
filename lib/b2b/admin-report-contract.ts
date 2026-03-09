import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";

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
    allowsCustomInput?: boolean;
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
      options?: Array<{
        value: string;
        label: string;
        score?: number;
        allowsCustomInput?: boolean;
      }>;
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
  generatedAt?: string;
  intent?: string;
  pageSize?: string;
  variantIndex?: number;
  stylePresetCandidates?: string[];
  selectedStylePreset?: string | null;
  validation?: Array<{
    stylePreset?: string | null;
    stage: string;
    ok: boolean;
    issues?: LayoutValidationIssue[];
    runtimeEngine?: string;
    blockingIssueCount?: number;
    runtimeIssueCount?: number;
    staticIssueCount?: number;
    mergedIssueCount?: number;
    dedupedIssueCount?: number;
  }>;
  selectedStage?: string | null;
  pageCount?: number;
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
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset?: string | null;
  periodKey?: string | null;
  reportCycle?: number | null;
  payload?: ReportSummaryPayload;
  layoutDsl?: unknown;
  exportAudit?: ReportAudit | null;
  updatedAt: string;
};

export type ReportListItem = {
  id: string;
  variantIndex: number;
  status: string;
  pageSize: string;
  stylePreset: string | null;
  periodKey?: string | null;
  reportCycle?: number | null;
  createdAt: string;
  updatedAt: string;
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
  reportCycle?: number | string | null;
  submittedAt?: string | null;
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

export type MutationReportSummary = {
  id: string;
  variantIndex: number;
  status: string;
  periodKey?: string | null;
  updatedAt: string;
};

export type SurveySaveResult = {
  id: string;
  periodKey?: string | null;
  reportCycle?: number | null;
  selectedSections: string[];
  answerCount: number;
  updatedAt: string;
  report: MutationReportSummary | null;
};

export type SurveyPutResponse = {
  ok: boolean;
  response: SurveySaveResult;
};

export type AnalysisSnapshot = {
  id: string;
  version: number;
  periodKey?: string | null;
  reportCycle?: number | null;
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

export type AnalysisMutationSnapshot = {
  id: string;
  version: number;
  periodKey: string;
  reportCycle?: number | null;
  updatedAt: string;
  summary?: object | null;
  trend?: object | null;
  aiEvaluation?: object | null;
};

export type AnalysisMutationResponse = {
  ok: boolean;
  analysis: AnalysisMutationSnapshot;
  report: MutationReportSummary;
};

export type NoteSnapshot = {
  id: string;
  note?: string | null;
  recommendations?: string | null;
  cautions?: string | null;
  createdByAdminTag?: string | null;
  periodKey?: string | null;
  reportCycle?: number | null;
  updatedAt?: string | null;
};

export type NoteGetResponse = {
  ok: boolean;
  note: NoteSnapshot | null;
};

export type NoteSaveResult = {
  id: string;
  periodKey?: string | null;
  reportCycle?: number | null;
  updatedAt: string;
};

export type NotePutResponse = {
  ok: boolean;
  note: NoteSaveResult;
};

export type ReportGetResponse = {
  ok: boolean;
  latest: LatestReport;
  reports: ReportListItem[];
  availablePeriods: string[];
  periodKey: string;
};

export type ReportPostResponse = {
  ok: boolean;
  report: LatestReport;
};

export type ValidationResponse = {
  ok: boolean;
  layout?: LayoutDocument;
  audit?: ReportAudit;
  issues?: LayoutValidationIssue[];
};
