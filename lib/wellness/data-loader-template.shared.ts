import type { WellnessCommonSurvey } from "@/lib/wellness/data-schemas";

export type CommonQuestion = WellnessCommonSurvey["questions"][number];

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
