import commonSurveyJson from "@/data/b2b/survey.common.json";
import reportTextsJson from "@/data/b2b/report.texts.json";
import scoringRulesJson from "@/data/b2b/scoring.rules.json";
import sectionSurveyJson from "@/data/b2b/survey.sections.json";
import { buildWellnessTemplateForB2b } from "@/lib/wellness/data-loader-template";
import {
  commonSurveySchema,
  reportTextsSchema,
  scoringRulesSchema,
  sectionSurveySchema,
} from "@/lib/wellness/data-schemas";
import type {
  WellnessCommonSurvey,
  WellnessReportTexts,
  WellnessScoringRules,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-schemas";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";

export type {
  WellnessCommonSurvey,
  WellnessReportTexts,
  WellnessScoringRules,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-schemas";
export type {
  WellnessSurveyQuestionForTemplate,
  WellnessSurveyTemplate,
} from "@/lib/wellness/data-template-types";

type WellnessDataBundle = {
  common: WellnessCommonSurvey;
  sections: WellnessSectionSurvey;
  rules: WellnessScoringRules;
  texts: WellnessReportTexts;
};

let cachedDataBundle: WellnessDataBundle | null = null;
let cachedTemplate: WellnessSurveyTemplate | null = null;

export function loadWellnessDataBundle(): WellnessDataBundle {
  if (cachedDataBundle) return cachedDataBundle;
  const bundle = {
    common: commonSurveySchema.parse(commonSurveyJson),
    sections: sectionSurveySchema.parse(sectionSurveyJson),
    rules: scoringRulesSchema.parse(scoringRulesJson),
    texts: reportTextsSchema.parse(reportTextsJson),
  };
  cachedDataBundle = bundle;
  return bundle;
}

export function loadWellnessTemplateForB2b(): WellnessSurveyTemplate {
  if (cachedTemplate) return cachedTemplate;
  const template = buildWellnessTemplateForB2b(loadWellnessDataBundle());
  cachedTemplate = template;
  return template;
}
