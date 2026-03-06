import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  resolveSurveySelectionState,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";
import type { SurveyQuestion } from "./client-types";

type UseB2bAdminReportSurveyInputActionsParams = {
  wellnessTemplate: WellnessSurveyTemplate | null;
  selectedSections: string[];
  maxSelectedSections: number;
  setSurveyAnswers: Dispatch<SetStateAction<Record<string, unknown>>>;
  setSelectedSections: Dispatch<SetStateAction<string[]>>;
  setSurveyDirty: Dispatch<SetStateAction<boolean>>;
};

export function useB2bAdminReportSurveyInputActions({
  wellnessTemplate,
  selectedSections,
  maxSelectedSections,
  setSurveyAnswers,
  setSelectedSections,
  setSurveyDirty,
}: UseB2bAdminReportSurveyInputActionsParams) {
  const setAnswerValue = useCallback(
    (question: SurveyQuestion, value: unknown) => {
      setSurveyDirty(true);
      const template = wellnessTemplate;
      if (!template) {
        setSurveyAnswers((prev) => ({ ...prev, [question.key]: value }));
        return;
      }
      setSurveyAnswers((prev) => {
        const sanitized = sanitizeSurveyAnswerValue(
          question as WellnessSurveyQuestionForTemplate,
          value,
          maxSelectedSections
        );
        const nextState = resolveSurveySelectionState({
          template,
          answers: {
            ...prev,
            [question.key]: sanitized,
          } as PublicSurveyAnswers,
          selectedSections,
        });
        setSelectedSections(nextState.selectedSections);
        return nextState.answers;
      });
    },
    [
      maxSelectedSections,
      selectedSections,
      setSelectedSections,
      setSurveyAnswers,
      setSurveyDirty,
      wellnessTemplate,
    ]
  );

  const toggleSection = useCallback(
    (sectionKey: string) => {
      setSurveyDirty(true);
      const template = wellnessTemplate;
      if (!template) return;
      const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
      const c27Question = template.common.find((question) => question.key === c27Key);
      setSurveyAnswers((prevAnswers) => {
        const currentSelectedSections = resolveSelectedSectionsFromC27(
          template,
          prevAnswers as PublicSurveyAnswers,
          selectedSections
        );
        const nextSectionSet = new Set(currentSelectedSections);
        if (nextSectionSet.has(sectionKey)) {
          nextSectionSet.delete(sectionKey);
        } else if (nextSectionSet.size < maxSelectedSections) {
          nextSectionSet.add(sectionKey);
        }
        const toggledSections = [...nextSectionSet];
        const nextC27Value = c27Question
          ? sanitizeSurveyAnswerValue(c27Question, toggledSections, maxSelectedSections)
          : toggledSections;
        const nextAnswers = {
          ...prevAnswers,
          [c27Key]: nextC27Value,
        } as PublicSurveyAnswers;
        const nextState = resolveSurveySelectionState({
          template,
          answers: nextAnswers,
          selectedSections: toggledSections,
        });
        setSelectedSections(nextState.selectedSections);
        return nextState.answers;
      });
    },
    [
      maxSelectedSections,
      selectedSections,
      setSelectedSections,
      setSurveyAnswers,
      setSurveyDirty,
      wellnessTemplate,
    ]
  );

  return {
    setAnswerValue,
    toggleSection,
  };
}
