import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  resolveSurveySelectionState,
  sanitizeSurveyAnswerValue,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";

type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type UseSurveyAnswerActionsInput = {
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  selectedSectionsCommitted: string[];
  errorQuestionKey: string | null;
  phase: SurveyPhase;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
  setConfirmedQuestionKeys: Dispatch<SetStateAction<string[]>>;
  setSelectedSectionsCommitted: Dispatch<SetStateAction<string[]>>;
  setErrorQuestionKey: Dispatch<SetStateAction<string | null>>;
  setErrorText: Dispatch<SetStateAction<string | null>>;
  setPhase: Dispatch<SetStateAction<SurveyPhase>>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
};

function hasSameSectionSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function useSurveyAnswerActions({
  template,
  maxSelectedSections,
  selectedSectionsCommitted,
  errorQuestionKey,
  phase,
  setAnswers,
  setConfirmedQuestionKeys,
  setSelectedSectionsCommitted,
  setErrorQuestionKey,
  setErrorText,
  setPhase,
  setResult,
  setHasCompletedSubmission,
}: UseSurveyAnswerActionsInput) {
  const applyAnswer = useCallback(
    (question: WellnessSurveyQuestionForTemplate, rawValue: unknown) => {
      setAnswers((prev) => {
        const sanitized = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
        const nextState = resolveSurveySelectionState({
          template,
          answers: { ...prev, [question.key]: sanitized },
          selectedSections: selectedSectionsCommitted,
        });
        if (!hasSameSectionSelection(nextState.selectedSections, selectedSectionsCommitted)) {
          setSelectedSectionsCommitted(nextState.selectedSections);
        }
        return nextState.answers;
      });
      if (errorQuestionKey === question.key) {
        setErrorQuestionKey(null);
        setErrorText(null);
      }
      if (phase === "result") {
        setPhase("survey");
        setResult(null);
        setHasCompletedSubmission(false);
      }
    },
    [
      errorQuestionKey,
      maxSelectedSections,
      phase,
      selectedSectionsCommitted,
      setAnswers,
      setErrorQuestionKey,
      setErrorText,
      setHasCompletedSubmission,
      setPhase,
      setResult,
      setSelectedSectionsCommitted,
      template,
    ]
  );

  const addConfirmedQuestion = useCallback((questionKey: string, visibleKeys: Set<string>) => {
    setConfirmedQuestionKeys((prev) => {
      const next = new Set(prev);
      next.add(questionKey);
      return [...next].filter((key) => visibleKeys.has(key));
    });
  }, [setConfirmedQuestionKeys]);

  return {
    applyAnswer,
    addConfirmedQuestion,
  };
}
