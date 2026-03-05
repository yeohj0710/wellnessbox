import type {
  WellnessCommonSurvey,
  WellnessSectionSurvey,
} from "@/lib/wellness/data-schemas";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import {
  isCustomInputOptionLabel,
  isNoneLikeOptionLabel,
  isOptionalSelectionPrompt,
  mergeNoSelectionGuide,
  normalizeOptionLabel,
  normalizeTemplateQuestionType,
} from "@/lib/wellness/data-loader-template.shared";

type C27Question = WellnessCommonSurvey["questions"][number] | undefined;
type SectionQuestion = WellnessSectionSurvey["sections"][number]["questions"][number];

function mapSectionOptions(
  options: SectionQuestion["options"],
  stripNoneLikeOption: boolean
) {
  let removedNoneLikeOption = false;
  const mappedOptions = options
    .map((option) => {
      const label = normalizeOptionLabel(option.label);
      return {
        value: option.value,
        label,
        score: option.score,
        allowsCustomInput: isCustomInputOptionLabel(label),
      };
    })
    .filter((option) => {
      const shouldRemove = stripNoneLikeOption && isNoneLikeOptionLabel(option.label);
      if (shouldRemove) removedNoneLikeOption = true;
      return !shouldRemove;
    });

  return {
    options: mappedOptions,
    removedNoneLikeOption,
  };
}

function mapSectionQuestionVariants(question: SectionQuestion, stripNoneLikeOption: boolean) {
  let removedNoneLikeOption = false;
  const variants = Object.fromEntries(
    Object.entries(question.variants ?? {}).map(([variantKey, variant]) => [
      variantKey,
      {
        variantId: variant.variantId ?? variantKey,
        optionsPrefix: variant.optionsPrefix ?? undefined,
        options: variant.options
          .map((option) => {
            const label = normalizeOptionLabel(option.label);
            return {
              value: option.value,
              label,
              score: option.score,
              allowsCustomInput: isCustomInputOptionLabel(label),
            };
          })
          .filter((option) => {
            const shouldRemove = stripNoneLikeOption && isNoneLikeOptionLabel(option.label);
            if (shouldRemove) removedNoneLikeOption = true;
            return !shouldRemove;
          }),
      },
    ])
  );

  return {
    variants,
    removedNoneLikeOption,
  };
}

function resolveSectionQuestionRequired(input: {
  question: SectionQuestion;
  removedNoneLikeOption: boolean;
}) {
  const { question, removedNoneLikeOption } = input;
  if (typeof question.required === "boolean") return question.required;
  if (question.type === "multi_select_with_none" || question.type === "multi_select_limited") {
    return false;
  }
  if (isOptionalSelectionPrompt(question.prompt)) return false;
  if (removedNoneLikeOption) return false;
  // 세부 섹션 문항은 기본적으로 "선택"으로 두고, 데이터에서 명시적으로 required=true일 때만 필수 처리한다.
  return false;
}

export function mapSectionTemplates(
  sectionSurvey: WellnessSectionSurvey
): WellnessSurveyTemplate["sections"] {
  return sectionSurvey.sections.map((section) => ({
    key: section.id,
    title: section.title,
    displayName: section.title,
    description: `${section.title} 관련 상세 문항`,
    questions: section.questions.map((question) => {
      const shouldStripNoneLikeOption =
        question.type === "multi_select_limited" || question.type === "multi_select_with_none";
      const mappedOptions = mapSectionOptions(question.options, shouldStripNoneLikeOption);
      const mappedVariants = mapSectionQuestionVariants(question, shouldStripNoneLikeOption);
      const removedNoneLikeOption =
        mappedOptions.removedNoneLikeOption || mappedVariants.removedNoneLikeOption;

      return {
        key: question.id,
        index: question.number,
        text: question.prompt,
        helpText: mergeNoSelectionGuide(undefined, removedNoneLikeOption),
        type: normalizeTemplateQuestionType(question.type),
        sourceType: question.type,
        required: resolveSectionQuestionRequired({
          question,
          removedNoneLikeOption,
        }),
        options: mappedOptions.options,
        maxSelect:
          question.type === "multi_select_limited" ||
          question.type === "multi_select_with_none"
            ? question.constraints?.maxSelections ?? Math.max(1, mappedOptions.options.length)
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
        variants: mappedVariants.variants,
      };
    }),
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
