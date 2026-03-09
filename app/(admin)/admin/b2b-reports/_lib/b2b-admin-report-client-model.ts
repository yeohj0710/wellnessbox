import {
  buildPublicSurveyQuestionList,
  computeSurveyProgress,
  resolveSelectedSectionsFromC27,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import type { EmployeeListItem } from "./client-types";

export function resolveAdminReportWellnessTemplate(template: unknown) {
  return (template ?? null) as WellnessSurveyTemplate | null;
}

export function resolveAdminReportSurveyAnswersRecord(answers: Record<string, unknown>) {
  return answers as PublicSurveyAnswers;
}

export function resolveAdminReportSelectedSections(input: {
  wellnessTemplate: WellnessSurveyTemplate | null;
  surveyAnswersRecord: PublicSurveyAnswers;
  selectedSections: string[];
}) {
  if (!input.wellnessTemplate) return input.selectedSections;
  return resolveSelectedSectionsFromC27(
    input.wellnessTemplate,
    input.surveyAnswersRecord,
    input.selectedSections
  );
}

export function computeAdminReportCompletionStats(input: {
  wellnessTemplate: WellnessSurveyTemplate | null;
  surveyAnswersRecord: PublicSurveyAnswers;
  resolvedSelectedSections: string[];
}) {
  if (!input.wellnessTemplate) {
    return { total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0, percent: 0 };
  }
  const questionList = buildPublicSurveyQuestionList(
    input.wellnessTemplate,
    input.surveyAnswersRecord,
    input.resolvedSelectedSections,
    { deriveSelectedSections: false }
  );
  return computeSurveyProgress(questionList, input.surveyAnswersRecord);
}

export function resolveAdminReportSelectedEmployee(input: {
  employees: EmployeeListItem[];
  selectedEmployeeId: string | null;
}) {
  return input.employees.find((employee) => employee.id === input.selectedEmployeeId) ?? null;
}
