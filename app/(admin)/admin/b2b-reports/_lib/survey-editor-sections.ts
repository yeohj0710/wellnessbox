import {
  buildPublicSurveyQuestionList,
  isSurveyQuestionAnswered,
  resolveSelectedSectionsFromC27,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import {
  buildSurveySections,
  isOptionalSelectionQuestion,
} from "@/app/survey/_lib/survey-page-helpers";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";

export type SurveySectionGroup = {
  key: string;
  title: string;
  questions: WellnessSurveyQuestionForTemplate[];
};

export { isOptionalSelectionQuestion };

export function buildEditorSections(
  template: WellnessSurveyTemplate | null,
  answers: PublicSurveyAnswers,
  selectedSections: string[]
) {
  if (!template) return [] as SurveySectionGroup[];

  const resolvedSelectedSections = resolveSelectedSectionsFromC27(
    template,
    answers,
    selectedSections
  );
  const sectionTitleMap = new Map(
    template.sectionCatalog.map((item) => [item.key, item.displayName || item.title])
  );
  const questionList = buildPublicSurveyQuestionList(
    template,
    answers,
    resolvedSelectedSections,
    { deriveSelectedSections: false }
  );

  const groupedNodes = buildSurveySections(
    questionList,
    resolvedSelectedSections,
    sectionTitleMap,
    "\uACF5\uD1B5 \uBB38\uD56D"
  );
  return groupedNodes.map((group) => ({
    key: group.key,
    title: group.title,
    questions: group.questions.map((node) => node.question),
  }));
}

export function getFocusedQuestionIndex(
  section: SurveySectionGroup | null,
  focusedKey: string | undefined,
  answers: PublicSurveyAnswers
) {
  if (!section || section.questions.length === 0) return -1;
  if (focusedKey) {
    const index = section.questions.findIndex((item) => item.key === focusedKey);
    if (index >= 0) return index;
  }
  const firstUnanswered = section.questions.findIndex(
    (item) => !isSurveyQuestionAnswered(item, answers[item.key])
  );
  return firstUnanswered >= 0 ? firstUnanswered : 0;
}
