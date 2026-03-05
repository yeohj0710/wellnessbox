import type { WellnessCommonSurvey } from "@/lib/wellness/data-schemas";

export type CommonQuestion = WellnessCommonSurvey["questions"][number];

type TemplateQuestionType = CommonQuestion["type"] | "single_choice";

export type ResolveTemplateQuestionRequiredInput = {
  questionType: TemplateQuestionType;
  explicitRequired?: boolean;
  prompt?: string;
  displayIfField?: string;
  removedNoneLikeOption: boolean;
  hasOptionalSkipGuide?: boolean;
  defaultRequired: boolean;
};

const NONE_LIKE_LABELS = new Set(["없음", "해당없음", "해당 없음", "해당무"]);
const CUSTOM_OPTION_LABEL_REGEX = /기타/u;

export const NONE_OPTION_GUIDE_TEXT =
  "해당되는 항목이 없으면 선택하지 않고 다음 문항으로 넘어가세요.";

function normalizeCompactLabel(label: string | undefined) {
  if (!label) return "";
  return label.replace(/\s+/g, "").trim();
}

export function isNoneLikeOptionLabel(label: string | undefined) {
  const normalized = normalizeCompactLabel(label);
  if (!normalized) return false;
  return NONE_LIKE_LABELS.has(normalized);
}

export function isCustomInputOptionLabel(label: string | undefined) {
  if (!label) return false;
  return CUSTOM_OPTION_LABEL_REGEX.test(label);
}

export function normalizeOptionLabel(label: string | undefined) {
  if (!label) return "";
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (isCustomInputOptionLabel(normalized)) {
    return "기타 (직접 입력)";
  }
  return normalized;
}

export function mergeNoSelectionGuide(helpText: string | undefined, includeGuide: boolean) {
  const trimmed = helpText?.trim() ?? "";
  if (!includeGuide) return trimmed || undefined;
  if (trimmed.includes("다음 문항으로 넘어가세요")) return trimmed;
  return trimmed ? `${trimmed} ${NONE_OPTION_GUIDE_TEXT}` : NONE_OPTION_GUIDE_TEXT;
}

function normalizeCompactText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, "").trim();
}

export function isOptionalSelectionPrompt(value: string | undefined) {
  const normalized = normalizeCompactText(value);
  if (!normalized) return false;
  return (
    normalized.includes("여성의경우") ||
    normalized.includes("남성의경우") ||
    (normalized.includes("해당되는") &&
      normalized.includes("있으시면") &&
      normalized.includes("선택")) ||
    normalized.includes("해당되는건강항목")
  );
}

export function resolveTemplateQuestionRequired(
  input: ResolveTemplateQuestionRequiredInput
) {
  if (typeof input.explicitRequired === "boolean") return input.explicitRequired;
  if (
    input.questionType === "multi_select_with_none" ||
    input.questionType === "multi_select_limited"
  ) {
    return false;
  }
  if (input.displayIfField) return false;
  if (isOptionalSelectionPrompt(input.prompt)) return false;
  if (input.hasOptionalSkipGuide) return false;
  if (input.removedNoneLikeOption) return false;
  return input.defaultRequired;
}

export function normalizeTemplateQuestionType(type: CommonQuestion["type"]) {
  switch (type) {
    case "single_choice":
      return "single" as const;
    case "multi_select_with_none":
    case "multi_select_limited":
      return "multi" as const;
    case "number":
      return "number" as const;
    case "group":
      return "group" as const;
    default:
      return "text" as const;
  }
}
