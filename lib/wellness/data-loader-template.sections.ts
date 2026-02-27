import type {
  WellnessCommonSurvey,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-schemas";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import { normalizeTemplateQuestionType } from "@/lib/wellness/data-loader-template.shared";

type C27Question = WellnessCommonSurvey["questions"][number] | undefined;
type SectionQuestion = WellnessSectionSurvey["sections"][number]["questions"][number];

function mapSectionQuestionVariants(question: SectionQuestion) {
  return Object.fromEntries(
    Object.entries(question.variants ?? {}).map(([variantKey, variant]) => [
      variantKey,
      {
        variantId: variant.variantId ?? variantKey,
        optionsPrefix: variant.optionsPrefix ?? undefined,
        options: variant.options.map((option) => ({
          value: option.value,
          label: option.label,
          score: option.score,
        })),
      },
    ])
  );
}

export function mapSectionTemplates(
  sectionSurvey: WellnessSectionSurvey
): WellnessSurveyTemplate["sections"] {
  return sectionSurvey.sections.map((section) => ({
    key: section.id,
    title: section.title,
    displayName: section.title,
    description: `${section.title} 관련 상세 문항`,
    questions: section.questions.map((question) => ({
      key: question.id,
      index: question.number,
      text: question.prompt,
      helpText: undefined,
      type: normalizeTemplateQuestionType(question.type),
      sourceType: question.type,
      required: true,
      options: question.options.map((option) => ({
        value: option.value,
        label: option.label,
        score: option.score,
      })),
      maxSelect:
        question.type === "multi_select_limited" ||
        question.type === "multi_select_with_none"
          ? question.constraints?.maxSelections ?? question.options.length
          : undefined,
      optionsPrefix: question.optionsPrefix ?? undefined,
      constraints: question.constraints
        ? {
            maxSelections: question.constraints.maxSelections,
            recommendedSelectionsRange: question.constraints.recommendedSelectionsRange,
          }
        : undefined,
      scoringEnabled: question.scoring?.enabled === true,
      noneOptionValue: undefined,
      variants: mapSectionQuestionVariants(question),
    })),
  }));
}

export function mapSectionCatalog(
  c27Question: C27Question,
  sectionSurvey: WellnessSectionSurvey
): WellnessSurveyTemplate["sectionCatalog"] {
  const sectionById = new Map(sectionSurvey.sections.map((section) => [section.id, section]));
  const sectionCatalog: WellnessSurveyTemplate["sectionCatalog"] = [];

  for (const option of c27Question?.options ?? []) {
    const section = sectionById.get(option.value);
    if (!section) continue;
    sectionCatalog.push({
      key: section.id,
      title: section.title,
      displayName: section.title,
      description: `${section.title} 관련 상세 문항`,
      triggerLabel: option.label,
      questionCount: section.questions.length,
      aliases: option.aliases ?? [],
    });
  }

  return sectionCatalog.filter(
    (section, index, source) => source.findIndex((item) => item.key === section.key) === index
  );
}
