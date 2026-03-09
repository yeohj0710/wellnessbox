import {
  buildPublicSurveyQuestionList,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import {
  buildSurveySections,
  getFocusedIndex,
  isOptionalSelectionQuestion,
  resolveQuestionNumericWarning,
  type SurveySectionGroup,
} from "./survey-page-helpers";

export function hasSameSectionSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function resolveCurrentSectionQuestionContext(input: {
  currentSection: SurveySectionGroup | null;
  fromQuestionKey?: string;
  focusedQuestionKey?: string;
  answers: PublicSurveyAnswers;
}) {
  const { currentSection, fromQuestionKey, focusedQuestionKey, answers } = input;
  if (!currentSection || currentSection.questions.length === 0) return null;

  const isAutoAdvanceFromAnswer = typeof fromQuestionKey === "string";
  const at =
    fromQuestionKey != null
      ? currentSection.questions.findIndex((item) => item.question.key === fromQuestionKey)
      : getFocusedIndex(currentSection, focusedQuestionKey, answers);
  if (at < 0) return null;

  const currentNode = currentSection.questions[at];
  if (!currentNode) return null;

  return {
    at,
    currentNode,
    isAutoAdvanceFromAnswer,
  };
}

export function buildEffectiveSurveyStructure(input: {
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  buildVisibleQuestionList: (
    inputAnswers: PublicSurveyAnswers,
    selectedSections: string[]
  ) => ReturnType<typeof buildPublicSurveyQuestionList>;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
}) {
  const effectiveQuestionList = input.buildVisibleQuestionList(
    input.answers,
    input.selectedSections
  );
  return {
    effectiveQuestionList,
    effectiveVisibleKeySet: new Set(
      effectiveQuestionList.map((item) => item.question.key)
    ),
    effectiveSections: buildSurveySections(
      effectiveQuestionList,
      input.selectedSections,
      input.sectionTitleMap,
      input.commonSectionTitle
    ),
  };
}

export function findSectionValidationIssue(input: {
  section: SurveySectionGroup;
  answers: PublicSurveyAnswers;
}) {
  for (const node of input.section.questions) {
    const question = node.question;
    const answerValue = input.answers[question.key];
    const numericWarning = resolveQuestionNumericWarning(question, answerValue);
    if (numericWarning) {
      return {
        questionKey: question.key,
        errorText: numericWarning,
      };
    }
    const validationError = validateSurveyQuestionAnswer(question, answerValue, {
      treatSelectionAsOptional: isOptionalSelectionQuestion(question),
    });
    if (validationError) {
      return {
        questionKey: question.key,
        errorText: validationError,
      };
    }
  }

  return null;
}
