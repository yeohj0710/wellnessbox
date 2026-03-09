import { resolveSelectedSectionsFromC27, type PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type {
  WellnessComputedResult,
} from "@/lib/wellness/analysis";
import type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";
import { isOptionalHintLikeText, resolveProgressMessage } from "./survey-page-helpers";
import { tryComputeSurveyResultFromAnswers } from "./survey-result-derivation";

type AuthBusyState = "idle" | "session" | "init" | "sign" | "sync";
type SurveyPhase = "intro" | "survey" | "calculating" | "result";

type ResolveSurveyIntroStateInput = {
  hydrated: boolean;
  authBusy: AuthBusyState;
  authVerified: boolean;
  identityEditable: boolean;
};

type ResolveSurveySectionUiStateInput = {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  currentSectionKey: string | null;
  currentSectionIndex: number;
  surveySectionsLength: number;
  isAdminLoggedIn: boolean;
  progressPercent: number;
  text: {
    prevSection: string;
    nextSection: string;
    resultCheck: string;
    submitSurvey: string;
  };
};

type ResolveSurveyResultSummaryInput = {
  phase: SurveyPhase;
  isAdminLoggedIn: boolean;
  result: WellnessComputedResult | null;
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
};

export function resolveSurveyIntroState({
  hydrated,
  authBusy,
  authVerified,
  identityEditable,
}: ResolveSurveyIntroStateInput) {
  const identityLocked = authVerified && !identityEditable;
  const authInitializing = !hydrated || authBusy === "session";

  return {
    identityLocked,
    authInitializing,
    startDisabled: !authVerified || authBusy !== "idle" || authInitializing,
  };
}

export function resolveSurveySectionUiState({
  template,
  answers,
  selectedSectionsCommitted,
  currentSectionKey,
  currentSectionIndex,
  surveySectionsLength,
  isAdminLoggedIn,
  progressPercent,
  text,
}: ResolveSurveySectionUiStateInput) {
  const hasPrevStep = currentSectionIndex > 0;
  const isCommonSurveySection = currentSectionKey === "common";
  const liveSelectedSections = resolveSelectedSectionsFromC27(
    template,
    answers,
    selectedSectionsCommitted
  );
  const hasLiveDetailedSectionSelection = liveSelectedSections.length > 0;
  const atLastSection = currentSectionIndex >= surveySectionsLength - 1;
  const shouldShowNextSectionLabelAtCommon =
    isCommonSurveySection && atLastSection && hasLiveDetailedSectionSelection;
  const nextButtonLabel =
    atLastSection && !shouldShowNextSectionLabelAtCommon
      ? isAdminLoggedIn
        ? text.resultCheck
        : text.submitSurvey
      : text.nextSection;

  return {
    hasPrevStep,
    isCommonSurveySection,
    prevButtonLabel: text.prevSection,
    nextButtonLabel,
    progressMessage: resolveProgressMessage(progressPercent),
  };
}

export function resolveSurveyQuestionHelpText(
  question: WellnessSurveyQuestionForTemplate,
  optionalHintText: string
) {
  const rawHelpText = question.helpText?.trim() ?? "";
  if (!rawHelpText) return "";
  return isOptionalHintLikeText(rawHelpText, optionalHintText) ? "" : rawHelpText;
}

export function resolveSurveyResultSummary({
  phase,
  isAdminLoggedIn,
  result,
  template,
  answers,
  selectedSectionsCommitted,
}: ResolveSurveyResultSummaryInput) {
  if (phase !== "result" || !isAdminLoggedIn) return null;
  if (result) return result;
  return tryComputeSurveyResultFromAnswers({
    template,
    answers,
    selectedSections: selectedSectionsCommitted,
  });
}
