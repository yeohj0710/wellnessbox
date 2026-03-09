import { useCallback, useMemo } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";
import {
  resolveSurveyIntroState,
  resolveSurveyQuestionHelpText,
  resolveSurveyResultSummary,
  resolveSurveySectionUiState,
} from "./survey-page-client-model";

type AuthBusyState = "idle" | "session" | "init" | "sign" | "sync";
type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type UseSurveyPageDerivedStateInput = {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  phase: SurveyPhase;
  isAdminLoggedIn: boolean;
  result: WellnessComputedResult | null;
  hydrated: boolean;
  authBusy: AuthBusyState;
  authVerified: boolean;
  identityEditable: boolean;
  currentSectionKey: string | null;
  currentSectionIndex: number;
  surveySectionsLength: number;
  progressPercent: number;
  text: {
    optionalHint: string;
    prevSection: string;
    nextSection: string;
    resultCheck: string;
    submitSurvey: string;
  };
};

export function useSurveyPageDerivedState({
  template,
  answers,
  selectedSectionsCommitted,
  phase,
  isAdminLoggedIn,
  result,
  hydrated,
  authBusy,
  authVerified,
  identityEditable,
  currentSectionKey,
  currentSectionIndex,
  surveySectionsLength,
  progressPercent,
  text,
}: UseSurveyPageDerivedStateInput) {
  const introState = useMemo(
    () =>
      resolveSurveyIntroState({
        hydrated,
        authBusy,
        authVerified,
        identityEditable,
      }),
    [authBusy, authVerified, hydrated, identityEditable]
  );

  const sectionUiState = useMemo(
    () =>
      resolveSurveySectionUiState({
        template,
        answers,
        selectedSectionsCommitted,
        currentSectionKey,
        currentSectionIndex,
        surveySectionsLength,
        isAdminLoggedIn,
        progressPercent,
        text: {
          prevSection: text.prevSection,
          nextSection: text.nextSection,
          resultCheck: text.resultCheck,
          submitSurvey: text.submitSurvey,
        },
      }),
    [
      answers,
      currentSectionIndex,
      currentSectionKey,
      isAdminLoggedIn,
      progressPercent,
      selectedSectionsCommitted,
      surveySectionsLength,
      template,
      text.nextSection,
      text.prevSection,
      text.resultCheck,
      text.submitSurvey,
    ]
  );

  const resultSummary = useMemo(
    () =>
      resolveSurveyResultSummary({
        phase,
        isAdminLoggedIn,
        result,
        template,
        answers,
        selectedSectionsCommitted,
      }),
    [answers, isAdminLoggedIn, phase, result, selectedSectionsCommitted, template]
  );

  const resolveQuestionHelpTextForView = useCallback(
    (question: WellnessSurveyQuestionForTemplate) =>
      resolveSurveyQuestionHelpText(question, text.optionalHint),
    [text.optionalHint]
  );

  return {
    ...introState,
    ...sectionUiState,
    resultSummary,
    resolveQuestionHelpText: resolveQuestionHelpTextForView,
  };
}
