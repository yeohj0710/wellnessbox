import {
  buildWellnessAnalysisInputFromSurvey,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import { computeWellnessResult, type WellnessComputedResult } from "@/lib/wellness/analysis";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";

type SurveyResultDerivationInput = {
  template: WellnessSurveyTemplate;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
};

export function computeSurveyResultFromAnswers(
  input: SurveyResultDerivationInput
): WellnessComputedResult {
  return computeWellnessResult(
    buildWellnessAnalysisInputFromSurvey({
      template: input.template,
      answers: input.answers,
      selectedSections: input.selectedSections,
    })
  );
}

export function tryComputeSurveyResultFromAnswers(
  input: SurveyResultDerivationInput
): WellnessComputedResult | null {
  try {
    return computeSurveyResultFromAnswers(input);
  } catch {
    return null;
  }
}
