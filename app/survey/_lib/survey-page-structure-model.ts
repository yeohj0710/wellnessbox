import {
  buildPublicSurveyQuestionList,
  isSurveyQuestionAnswered,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import { resolveAutoComputedSurveyState } from "./survey-page-auto-compute";
import {
  buildSurveySections,
  isQuestionEffectivelyRequired,
  type SurveySectionGroup,
} from "./survey-page-helpers";

type BuildSurveyStructureInput = {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
};

type ComputeSurveyProgressInput = {
  surveySections: SurveySectionGroup[];
  answers: PublicSurveyAnswers;
  completedSectionKeys: string[];
};

export function buildVisibleSurveyQuestionList(input: {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  maxSelectedSections: number;
}) {
  const rawList = buildPublicSurveyQuestionList(
    input.template,
    input.answers,
    input.selectedSections,
    {
      deriveSelectedSections: false,
    }
  );
  const autoComputedState = resolveAutoComputedSurveyState({
    answers: input.answers,
    questionList: rawList,
    maxSelectedSections: input.maxSelectedSections,
  });

  return {
    rawList,
    autoComputedState,
    questionList: rawList.filter(
      (item) => !autoComputedState.hiddenQuestionKeys.has(item.question.key)
    ),
  };
}

export function buildSurveyPageStructure(input: BuildSurveyStructureInput) {
  const { rawList, autoComputedState, questionList } = buildVisibleSurveyQuestionList({
    template: input.template,
    answers: input.answers,
    selectedSections: input.selectedSections,
    maxSelectedSections: input.maxSelectedSections,
  });
  const surveySections = buildSurveySections(
    questionList,
    input.selectedSections,
    input.sectionTitleMap,
    input.commonSectionTitle
  );

  return {
    questionListRaw: rawList,
    autoComputedState,
    questionList,
    surveySections,
    visibleSectionKeySet: new Set(surveySections.map((section) => section.key)),
    visibleQuestionKeySet: new Set(questionList.map((item) => item.question.key)),
  };
}

export function computeSurveyProgress({
  surveySections,
  answers,
  completedSectionKeys,
}: ComputeSurveyProgressInput) {
  const completedSectionKeySet = new Set(completedSectionKeys);
  const progressTotalCount = surveySections.reduce(
    (total, section) => total + section.questions.length,
    0
  );
  if (progressTotalCount === 0) {
    return {
      progressTotalCount,
      progressDoneCount: 0,
      progressDisplayDoneCount: 0,
      progressPercent: 0,
      completedSectionKeySet,
    };
  }

  let progressDoneCount = 0;
  for (const section of surveySections) {
    const requiredQuestions = section.questions.filter((item) =>
      isQuestionEffectivelyRequired(item.question)
    );
    const hasAllRequiredAnswers = requiredQuestions.every((item) =>
      isSurveyQuestionAnswered(item.question, answers[item.question.key])
    );
    const canTreatSectionAsCompleted =
      completedSectionKeySet.has(section.key) && hasAllRequiredAnswers;

    if (canTreatSectionAsCompleted) {
      progressDoneCount += section.questions.length;
      continue;
    }

    for (const item of section.questions) {
      if (isSurveyQuestionAnswered(item.question, answers[item.question.key])) {
        progressDoneCount += 1;
      }
    }
  }

  const boundedDoneCount = Math.min(progressDoneCount, progressTotalCount);
  const progressDisplayDoneCount = Math.min(boundedDoneCount, progressTotalCount);
  const progressPercent = Math.round((progressDisplayDoneCount / progressTotalCount) * 100);

  return {
    progressTotalCount,
    progressDoneCount: boundedDoneCount,
    progressDisplayDoneCount,
    progressPercent,
    completedSectionKeySet,
  };
}
