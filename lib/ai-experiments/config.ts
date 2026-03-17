export type AiExperimentEventName =
  | "impression"
  | "primary_cta_click"
  | "secondary_cta_click"
  | "article_click";

export type AiExperimentVariant = {
  key: string;
  label: string;
  weight: number;
};

export type AiExperimentDefinition = {
  key: string;
  title: string;
  surface: string;
  summary: string;
  variants: AiExperimentVariant[];
  successEvents: AiExperimentEventName[];
  allowedEvents: AiExperimentEventName[];
};

export const AI_EXPERIMENTS = {
  explore_education_entry_v1: {
    key: "explore_education_entry_v1",
    title: "탐색 상단 교육 카드 카피 실험",
    surface: "explore",
    summary:
      "탐색 상단에서 이해 우선 카피와 행동 우선 카피 중 어느 쪽이 더 많이 읽기와 다음 행동으로 이어지는지 보는 실험입니다.",
    variants: [
      {
        key: "guide",
        label: "이해 우선",
        weight: 1,
      },
      {
        key: "action",
        label: "행동 우선",
        weight: 1,
      },
    ],
    successEvents: ["primary_cta_click", "secondary_cta_click", "article_click"],
    allowedEvents: [
      "impression",
      "primary_cta_click",
      "secondary_cta_click",
      "article_click",
    ],
  },
} satisfies Record<string, AiExperimentDefinition>;

export type AiExperimentKey = keyof typeof AI_EXPERIMENTS;

export function getAiExperimentDefinition(
  experimentKey: string
): AiExperimentDefinition | null {
  return AI_EXPERIMENTS[experimentKey as AiExperimentKey] ?? null;
}
