import {
  isSurveyQuestionAnswered,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import {
  isOptionalSelectionQuestion,
  type SurveySectionGroup,
} from "./survey-editor-sections";

type SurveyQuestionLike = SurveySectionGroup["questions"][number];

export function clampSectionIndex(index: number, sectionCount: number) {
  if (sectionCount <= 0) return 0;
  return Math.max(0, Math.min(index, sectionCount - 1));
}

export function findFirstUnansweredQuestionKey(
  section: SurveySectionGroup | null,
  answers: PublicSurveyAnswers
) {
  if (!section || section.questions.length === 0) return null;
  const unresolvedQuestion = section.questions.find(
    (question) => !isSurveyQuestionAnswered(question, answers[question.key])
  );
  return unresolvedQuestion?.key ?? section.questions[0]?.key ?? null;
}

export function resolveSectionFocusQuestionKey(input: {
  section: SurveySectionGroup | null;
  answers: PublicSurveyAnswers;
  currentFocusedQuestionKey?: string;
}) {
  const { section, answers, currentFocusedQuestionKey } = input;
  if (!section || section.questions.length === 0) return null;

  if (
    currentFocusedQuestionKey &&
    section.questions.some((question) => question.key === currentFocusedQuestionKey)
  ) {
    return currentFocusedQuestionKey;
  }

  return findFirstUnansweredQuestionKey(section, answers);
}

export function findCurrentQuestionIndex(input: {
  section: SurveySectionGroup | null;
  answers: PublicSurveyAnswers;
  fromQuestionKey?: string;
  focusedQuestionKey?: string;
}) {
  const { section, answers, fromQuestionKey, focusedQuestionKey } = input;
  if (!section || section.questions.length === 0) return -1;

  if (fromQuestionKey) {
    return section.questions.findIndex((question) => question.key === fromQuestionKey);
  }

  if (focusedQuestionKey) {
    const focusedIndex = section.questions.findIndex(
      (question) => question.key === focusedQuestionKey
    );
    if (focusedIndex >= 0) return focusedIndex;
  }

  const unansweredIndex = section.questions.findIndex(
    (question) => !isSurveyQuestionAnswered(question, answers[question.key])
  );
  if (unansweredIndex >= 0) return unansweredIndex;
  return section.questions.length > 0 ? 0 : -1;
}

export function validateQuestionAnswerForNavigation(
  question: SurveyQuestionLike,
  value: unknown
) {
  return validateSurveyQuestionAnswer(question, value, {
    treatSelectionAsOptional: isOptionalSelectionQuestion(question),
  });
}

export function findFirstInvalidQuestionInSection(
  section: SurveySectionGroup | null,
  answers: PublicSurveyAnswers
) {
  if (!section || section.questions.length === 0) return null;
  for (const question of section.questions) {
    const error = validateQuestionAnswerForNavigation(question, answers[question.key]);
    if (error) return { question, error };
  }
  return null;
}
