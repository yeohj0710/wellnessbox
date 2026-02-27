import type { WellnessCommonSurvey } from "@/lib/wellness/data-schemas";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import {
  normalizeTemplateQuestionType,
  type CommonQuestion,
} from "@/lib/wellness/data-loader-template.shared";

type CommonQuestionOption = NonNullable<CommonQuestion["options"]>[number];
type CommonQuestionItem = NonNullable<CommonQuestion["items"]>[number];
type CommonQuestionField = NonNullable<CommonQuestion["fields"]>[number];

function buildGeneratedValue(questionId: string, index: number, tag: string) {
  const suffix = String(index + 1).padStart(2, "0");
  return `${questionId}_${tag}_${suffix}`;
}

function normalizeConstraint(constraints: CommonQuestion["constraints"]) {
  if (!constraints) return undefined;
  const normalized = {
    min: constraints.min,
    max: constraints.max,
    integer: constraints.integer,
    maxSelections: constraints.maxSelections,
    recommendedSelectionsRange: constraints.recommendedSelectionsRange,
  };
  if (
    normalized.min == null &&
    normalized.max == null &&
    normalized.integer == null &&
    normalized.maxSelections == null &&
    !normalized.recommendedSelectionsRange
  ) {
    return undefined;
  }
  return normalized;
}

function mapQuestionFields(fields: CommonQuestion["fields"]) {
  if (!Array.isArray(fields)) return undefined;
  return fields.map((field: CommonQuestionField) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    unit: field.unit,
    constraints: field.constraints
      ? {
          min: field.constraints.min,
          max: field.constraints.max,
          integer: field.constraints.integer,
        }
      : undefined,
  }));
}

function buildPlaceholder(question: CommonQuestion) {
  if (question.type === "number") {
    return question.unit
      ? `숫자를 입력해 주세요 (${question.unit})`
      : "숫자를 입력해 주세요.";
  }
  if (question.type === "group") {
    const labels = (question.fields ?? []).map((field) => field.label).filter(Boolean);
    return labels.length > 0
      ? `${labels.join(", ")} 값을 입력해 주세요.`
      : "값을 입력해 주세요.";
  }
  return undefined;
}

function toDisplayIf(displayIf: CommonQuestion["displayIf"]) {
  if (!displayIf) return undefined;
  return {
    field: displayIf.field,
    equals: String(displayIf.equals),
  };
}

function mapOption(option: CommonQuestionOption, fallbackValue: string) {
  return {
    value: option.value || fallbackValue,
    label: option.label,
    score: option.score,
    aliases: option.aliases,
  };
}

function mapListItem(item: CommonQuestionItem, fallbackValue: string) {
  return {
    value: item.value || fallbackValue,
    label: item.label,
    aliases: item.aliases,
  };
}

function buildQuestionOptions(question: CommonQuestion) {
  const options: WellnessSurveyQuestionForTemplate["options"] = [];

  if (Array.isArray(question.options) && question.options.length > 0) {
    question.options.forEach((option, index) => {
      options.push(mapOption(option, buildGeneratedValue(question.id, index, "OPT")));
    });
  }

  if (Array.isArray(question.items) && question.items.length > 0) {
    question.items.forEach((item, index) => {
      options.push(mapListItem(item, buildGeneratedValue(question.id, index, "ITEM")));
    });
  }

  if (question.noneOption) {
    options.push({
      value: question.noneOption.value || `${question.id}_NONE`,
      label: question.noneOption.label,
      isNoneOption: true,
    });
  }

  return options;
}

export function mapCommonQuestions(
  commonSurvey: WellnessCommonSurvey,
  maxSelectedSections: number
): WellnessSurveyQuestionForTemplate[] {
  return commonSurvey.questions.map((question) => {
    const options = buildQuestionOptions(question);
    const noneOptionValue = options.find((option) => option.isNoneOption)?.value;
    const constraints = normalizeConstraint(question.constraints);

    return {
      key: question.id,
      index: question.number,
      text: question.prompt,
      helpText: question.notes,
      type: normalizeTemplateQuestionType(question.type),
      sourceType: question.type,
      required: true,
      options,
      placeholder: buildPlaceholder(question),
      maxSelect:
        question.type === "multi_select_limited" ||
        question.type === "multi_select_with_none"
          ? question.constraints?.maxSelections ?? maxSelectedSections
          : undefined,
      optionsPrefix: undefined,
      unit: question.unit,
      fields: mapQuestionFields(question.fields),
      displayIf: toDisplayIf(question.displayIf),
      constraints,
      scoringEnabled: question.scoring?.enabled === true,
      noneOptionValue,
      variants: undefined,
    };
  });
}
