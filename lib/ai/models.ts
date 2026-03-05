import db from "@/lib/db";

export const CHAT_MODEL_CONFIG_KEY = "chatModel";
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const BASELINE_MODEL_FOR_COST_INDEX = "gpt-4o-mini";

export type ChatModelFamily =
  | "gpt-4o"
  | "gpt-4.1"
  | "o-series"
  | "gpt-5"
  | "legacy";

export type ChatModelOption = {
  id: string;
  label: string;
  family: ChatModelFamily;
  description: string;
  inputUsdPer1M: number | null;
  outputUsdPer1M: number | null;
  relativeCostPercent: number | null;
  isLegacy?: boolean;
};

type ChatModelSeed = Omit<ChatModelOption, "relativeCostPercent">;

const CHAT_MODEL_SEEDS: readonly ChatModelSeed[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    family: "gpt-4o",
    description: "가성비 중심 기본 모델",
    inputUsdPer1M: 0.15,
    outputUsdPer1M: 0.6,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    family: "gpt-4o",
    description: "멀티모달 성능 강화",
    inputUsdPer1M: 2.5,
    outputUsdPer1M: 10,
  },
  {
    id: "gpt-4.1-nano",
    label: "GPT-4.1 nano",
    family: "gpt-4.1",
    description: "초경량·초저비용",
    inputUsdPer1M: 0.1,
    outputUsdPer1M: 0.4,
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    family: "gpt-4.1",
    description: "경량 균형형",
    inputUsdPer1M: 0.4,
    outputUsdPer1M: 1.6,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    family: "gpt-4.1",
    description: "정확도 중심 범용",
    inputUsdPer1M: 2,
    outputUsdPer1M: 8,
  },
  {
    id: "o4-mini",
    label: "o4-mini",
    family: "o-series",
    description: "추론형 경량",
    inputUsdPer1M: 1.1,
    outputUsdPer1M: 4.4,
  },
  {
    id: "o3",
    label: "o3",
    family: "o-series",
    description: "추론형 고성능",
    inputUsdPer1M: 2,
    outputUsdPer1M: 8,
  },
  {
    id: "gpt-5-nano",
    label: "GPT-5 nano",
    family: "gpt-5",
    description: "GPT-5 계열 초저비용",
    inputUsdPer1M: 0.05,
    outputUsdPer1M: 0.4,
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    family: "gpt-5",
    description: "GPT-5 경량 균형형",
    inputUsdPer1M: 0.25,
    outputUsdPer1M: 2,
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    family: "gpt-5",
    description: "GPT-5 기본 고성능",
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 10,
  },
  {
    id: "gpt-5.1",
    label: "GPT-5.1",
    family: "gpt-5",
    description: "GPT-5.1 개선 버전",
    inputUsdPer1M: 1.5,
    outputUsdPer1M: 6,
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    family: "gpt-5",
    description: "GPT-5.2 최신 버전",
    inputUsdPer1M: 2,
    outputUsdPer1M: 8,
  },
  {
    id: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo (Legacy)",
    family: "legacy",
    description: "기존 호환용(권장 안 함)",
    inputUsdPer1M: null,
    outputUsdPer1M: null,
    isLegacy: true,
  },
];

function averageTokenCost(option: {
  inputUsdPer1M: number | null;
  outputUsdPer1M: number | null;
}) {
  if (option.inputUsdPer1M === null || option.outputUsdPer1M === null) {
    return null;
  }
  return (option.inputUsdPer1M + option.outputUsdPer1M) / 2;
}

const baselineOption = CHAT_MODEL_SEEDS.find(
  (option) => option.id === BASELINE_MODEL_FOR_COST_INDEX
);
const baselineAverageTokenCost = baselineOption
  ? averageTokenCost(baselineOption)
  : null;

const CHAT_MODEL_OPTIONS_INTERNAL: readonly ChatModelOption[] =
  CHAT_MODEL_SEEDS.map((option) => {
    const currentAverage = averageTokenCost(option);
    const relativeCostPercent =
      currentAverage === null || !baselineAverageTokenCost
        ? null
        : Math.round((currentAverage / baselineAverageTokenCost) * 100);

    return {
      ...option,
      relativeCostPercent,
    };
  });

const CHAT_MODEL_OPTION_MAP = new Map(
  CHAT_MODEL_OPTIONS_INTERNAL.map((option) => [option.id, option])
);

export const AVAILABLE_MODELS = CHAT_MODEL_OPTIONS_INTERNAL.map(
  (option) => option.id
);

export type ModelPricingReference = {
  baselineModel: string;
  baselineLabel: string;
  sourceUrl: string;
  updatedAt: string;
  note: string;
};

export const MODEL_PRICING_REFERENCE: ModelPricingReference = {
  baselineModel: BASELINE_MODEL_FOR_COST_INDEX,
  baselineLabel: "GPT-4o mini",
  sourceUrl: "https://developers.openai.com/api/docs/models/",
  updatedAt: "2026-03-05",
  note: "공식 모델 카드의 입력/출력 단가(1M tokens)를 평균 내어 4o-mini=100 기준으로 환산",
};

export function getChatModelOptions(): readonly ChatModelOption[] {
  return CHAT_MODEL_OPTIONS_INTERNAL;
}

export function getChatModelOption(model: string): ChatModelOption | null {
  return CHAT_MODEL_OPTION_MAP.get(model) ?? null;
}

export function isSupportedChatModel(model: unknown): model is string {
  if (typeof model !== "string") return false;
  return CHAT_MODEL_OPTION_MAP.has(model.trim());
}

export function normalizeChatModel(model: unknown): string {
  if (typeof model !== "string") return DEFAULT_CHAT_MODEL;
  const trimmed = model.trim();
  return CHAT_MODEL_OPTION_MAP.has(trimmed) ? trimmed : DEFAULT_CHAT_MODEL;
}

export async function getDefaultModel(): Promise<string> {
  const record = await db.config.findUnique({ where: { key: CHAT_MODEL_CONFIG_KEY } });
  return normalizeChatModel(record?.value);
}
