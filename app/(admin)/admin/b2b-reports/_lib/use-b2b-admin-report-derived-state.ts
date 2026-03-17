import { useMemo } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import type {
  CompletionStats,
  EmployeeListItem,
  SurveyTemplateSchema,
} from "./client-types";
import {
  computeAdminReportCompletionStats,
  resolveAdminReportSelectedEmployee,
  resolveAdminReportSelectedSections,
  resolveAdminReportSurveyAnswersRecord,
  resolveAdminReportWellnessTemplate,
} from "./b2b-admin-report-client-model";

type UseB2bAdminReportDerivedStateParams = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
  surveyTemplate: SurveyTemplateSchema | null;
  surveyAnswers: Record<string, unknown>;
  selectedSections: string[];
  surveyDirty: boolean;
  analysisDirty: boolean;
  reportCustomizationDirty: boolean;
};

type UseB2bAdminReportDerivedStateResult = {
  maxSelectedSections: number;
  wellnessTemplate: WellnessSurveyTemplate | null;
  surveyAnswersRecord: PublicSurveyAnswers;
  resolvedSelectedSections: string[];
  selectedSectionSet: Set<string>;
  selectedEmployee: EmployeeListItem | null;
  completionStats: CompletionStats;
  hasUnsavedDraft: boolean;
};

export function useB2bAdminReportDerivedState({
  employees,
  selectedEmployeeId,
  surveyTemplate,
  surveyAnswers,
  selectedSections,
  surveyDirty,
  analysisDirty,
  reportCustomizationDirty,
}: UseB2bAdminReportDerivedStateParams): UseB2bAdminReportDerivedStateResult {
  const maxSelectedSections = surveyTemplate?.rules?.maxSelectedSections ?? 5;
  const wellnessTemplate = useMemo(
    () => resolveAdminReportWellnessTemplate(surveyTemplate),
    [surveyTemplate]
  );
  const surveyAnswersRecord = useMemo(
    () => resolveAdminReportSurveyAnswersRecord(surveyAnswers),
    [surveyAnswers]
  );
  const resolvedSelectedSections = useMemo(
    () =>
      resolveAdminReportSelectedSections({
        wellnessTemplate,
        surveyAnswersRecord,
        selectedSections,
      }),
    [selectedSections, surveyAnswersRecord, wellnessTemplate]
  );
  const selectedSectionSet = useMemo(
    () => new Set(resolvedSelectedSections),
    [resolvedSelectedSections]
  );
  const selectedEmployee = useMemo(
    () =>
      resolveAdminReportSelectedEmployee({
        employees,
        selectedEmployeeId,
      }),
    [employees, selectedEmployeeId]
  );
  const completionStats = useMemo(
    () =>
      computeAdminReportCompletionStats({
        wellnessTemplate,
        surveyAnswersRecord,
        resolvedSelectedSections,
      }),
    [resolvedSelectedSections, surveyAnswersRecord, wellnessTemplate]
  );

  return {
    maxSelectedSections,
    wellnessTemplate,
    surveyAnswersRecord,
    resolvedSelectedSections,
    selectedSectionSet,
    selectedEmployee,
    completionStats,
    hasUnsavedDraft: surveyDirty || analysisDirty || reportCustomizationDirty,
  };
}
