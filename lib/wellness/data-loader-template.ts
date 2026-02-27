import type {
  WellnessCommonSurvey,
  WellnessReportTexts,
  WellnessScoringRules,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-schemas";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import {
  majorVersionOf,
  mapCommonQuestions,
  mapSectionCatalog,
  mapSectionTemplates,
} from "@/lib/wellness/data-loader-template.mappers";

type WellnessDataBundleInput = {
  common: WellnessCommonSurvey;
  sections: WellnessSectionSurvey;
  rules: WellnessScoringRules;
  texts: WellnessReportTexts;
};

export function buildWellnessTemplateForB2b(
  bundle: WellnessDataBundleInput
): WellnessSurveyTemplate {
  const c27 = bundle.common.questions.find((question) => question.id === "C27");
  const maxSelectedSections = c27?.constraints?.maxSelections ?? 5;
  const recommendedSelectionsRange = c27?.constraints?.recommendedSelectionsRange;

  const common = mapCommonQuestions(bundle.common, maxSelectedSections);
  const sections = mapSectionTemplates(bundle.sections);
  const sectionCatalog = mapSectionCatalog(c27, bundle.sections);

  return {
    version: majorVersionOf(bundle.common.version),
    title: bundle.common.title,
    description: `${bundle.common.title} + 상세 섹션 설문`,
    common,
    sectionCatalog,
    sections,
    rules: {
      selectSectionByCommonQuestionKey: "C27",
      maxSelectedSections,
      minSelectedSections: 0,
      recommendedSelectionsRange,
    },
  };
}
