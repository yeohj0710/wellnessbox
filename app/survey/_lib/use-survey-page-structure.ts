import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import {
  buildSurveyPageStructure,
  buildVisibleSurveyQuestionList,
  computeSurveyProgress,
} from "./survey-page-structure-model";

type UseSurveyPageStructureInput = {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  completedSectionKeys: string[];
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
};

export function useSurveyPageStructure({
  template,
  answers,
  selectedSectionsCommitted,
  completedSectionKeys,
  maxSelectedSections,
  sectionTitleMap,
  commonSectionTitle,
  setAnswers,
}: UseSurveyPageStructureInput) {
  const {
    questionListRaw,
    questionList,
    surveySections,
    visibleSectionKeySet,
    visibleQuestionKeySet,
  } = useMemo(
    () =>
      buildSurveyPageStructure({
        template,
        answers,
        selectedSections: selectedSectionsCommitted,
        maxSelectedSections,
        sectionTitleMap,
        commonSectionTitle,
      }),
    [
      answers,
      commonSectionTitle,
      maxSelectedSections,
      sectionTitleMap,
      selectedSectionsCommitted,
      template,
    ]
  );

  useEffect(() => {
    if (questionListRaw.length === 0) return;
    setAnswers((prev) =>
      buildVisibleSurveyQuestionList({
        template,
        answers: prev,
        selectedSections: selectedSectionsCommitted,
        maxSelectedSections,
      }).autoComputedState.answers
    );
  }, [maxSelectedSections, questionListRaw, selectedSectionsCommitted, setAnswers, template]);

  const progressState = useMemo(
    () =>
      computeSurveyProgress({
        surveySections,
        answers,
        completedSectionKeys: completedSectionKeys.filter((key) => visibleSectionKeySet.has(key)),
      }),
    [answers, completedSectionKeys, surveySections, visibleSectionKeySet]
  );

  const buildVisibleQuestionList = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) =>
      buildVisibleSurveyQuestionList({
        template,
        answers: inputAnswers,
        selectedSections,
        maxSelectedSections,
      }).questionList,
    [maxSelectedSections, template]
  );

  return {
    buildVisibleQuestionList,
    questionList,
    surveySections,
    visibleSectionKeySet,
    visibleQuestionKeySet,
    completedSectionKeySet: progressState.completedSectionKeySet,
    progressTotalCount: progressState.progressTotalCount,
    progressDoneCount: progressState.progressDoneCount,
    progressDisplayDoneCount: progressState.progressDisplayDoneCount,
    progressPercent: progressState.progressPercent,
  };
}
