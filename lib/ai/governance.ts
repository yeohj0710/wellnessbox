import type { UserContextSummary } from "@/lib/chat/context.types";
import {
  DEFAULT_CHAT_MODEL,
  getChatModelOption,
  getChatModelOptions,
  normalizeChatModel,
} from "./models";

export type AiGovernanceTask =
  | "chat_stream"
  | "chat_title"
  | "chat_action_planner"
  | "chat_action_suggestions"
  | "chat_topic_classifier"
  | "nhis_summary"
  | "b2b_evaluation"
  | "agent_playground";

export type AiGovernanceResolution = {
  task: AiGovernanceTask;
  configuredModel: string;
  resolvedModel: string;
  policyLabel: string;
  purpose: string;
  reasoning: string[];
};

export type AiGovernancePreview = {
  task: AiGovernanceTask;
  label: string;
  purpose: string;
  configuredModel: string;
  resolvedModel: string;
  reasoning: string[];
};

type GovernanceTaskPolicy = {
  label: string;
  purpose: string;
  mode: "inherit" | "fixed" | "floor";
  fixedModel?: string;
  floorModel?: string;
};

const TASK_POLICIES: Record<AiGovernanceTask, GovernanceTaskPolicy> = {
  chat_stream: {
    label: "메인 상담",
    purpose: "사용자와 직접 대화하는 핵심 상담 응답",
    mode: "floor",
    floorModel: "gpt-4o-mini",
  },
  chat_title: {
    label: "채팅 제목 생성",
    purpose: "짧은 제목 요약처럼 속도와 비용이 중요한 보조 작업",
    mode: "fixed",
    fixedModel: "gpt-4.1-nano",
  },
  chat_action_planner: {
    label: "채팅 액션 플래너",
    purpose: "짧은 JSON 분류와 UI 액션 결정",
    mode: "fixed",
    fixedModel: "gpt-4.1-mini",
  },
  chat_action_suggestions: {
    label: "후속 액션 제안",
    purpose: "짧은 후속 질문과 CTA 제안 생성",
    mode: "fixed",
    fixedModel: "gpt-4.1-mini",
  },
  chat_topic_classifier: {
    label: "주제 분류",
    purpose: "짧은 주제 추출과 라우팅 보조",
    mode: "fixed",
    fixedModel: "gpt-4.1-nano",
  },
  nhis_summary: {
    label: "건강링크 요약",
    purpose: "건강검진·복약 데이터를 바탕으로 한 안전 민감 요약",
    mode: "floor",
    floorModel: "gpt-4.1",
  },
  b2b_evaluation: {
    label: "B2B 평가 브리핑",
    purpose: "내부 리포트용 구조화 요약과 행동 문장 생성",
    mode: "floor",
    floorModel: "gpt-4.1-mini",
  },
  agent_playground: {
    label: "에이전트 플레이그라운드",
    purpose: "관리자 실험과 비교 실행 환경",
    mode: "inherit",
  },
};

const MODEL_QUALITY_RANK: string[] = [
  "gpt-3.5-turbo",
  "gpt-4.1-nano",
  "gpt-5-nano",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-5-mini",
  "gpt-4o",
  "gpt-4.1",
  "o4-mini",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
  "o3",
];

function getQualityRank(model: string) {
  const normalized = normalizeChatModel(model);
  const index = MODEL_QUALITY_RANK.indexOf(normalized);
  if (index >= 0) return index;

  const option = getChatModelOption(normalized);
  if (!option) return MODEL_QUALITY_RANK.indexOf(DEFAULT_CHAT_MODEL);

  if (option.family === "gpt-5") return MODEL_QUALITY_RANK.indexOf("gpt-5");
  if (option.family === "o-series") return MODEL_QUALITY_RANK.indexOf("o4-mini");
  if (option.family === "gpt-4.1") return MODEL_QUALITY_RANK.indexOf("gpt-4.1-mini");
  if (option.family === "gpt-4o") return MODEL_QUALITY_RANK.indexOf("gpt-4o-mini");
  return MODEL_QUALITY_RANK.indexOf(DEFAULT_CHAT_MODEL);
}

function pickHigherQualityModel(left: string, right: string) {
  const leftNormalized = normalizeChatModel(left);
  const rightNormalized = normalizeChatModel(right);
  return getQualityRank(leftNormalized) >= getQualityRank(rightNormalized)
    ? leftNormalized
    : rightNormalized;
}

function resolveRiskFloor(summary?: UserContextSummary | null) {
  if (!summary) return null;

  const hasRiskSignals =
    summary.safetyEscalation.level !== "routine" ||
    summary.healthLink?.riskLevel === "high" ||
    summary.healthLink?.riskLevel === "medium" ||
    (summary.profile?.medications.length ?? 0) > 0 ||
    (summary.profile?.conditions.length ?? 0) > 0 ||
    summary.notableResponses.some((item) => item.signal === "주의");

  return hasRiskSignals ? "gpt-4.1-mini" : null;
}

export function resolveGovernedModel(input: {
  task: AiGovernanceTask;
  configuredModel?: string | null;
  summary?: UserContextSummary | null;
}): AiGovernanceResolution {
  const configuredModel = normalizeChatModel(
    input.configuredModel || DEFAULT_CHAT_MODEL
  );
  const policy = TASK_POLICIES[input.task];
  const reasoning: string[] = [];
  let resolvedModel = configuredModel;

  if (policy.mode === "fixed" && policy.fixedModel) {
    resolvedModel = normalizeChatModel(policy.fixedModel);
    if (resolvedModel !== configuredModel) {
      reasoning.push(
        `${policy.label}은 짧고 반복적인 작업이라 기본 모델 대신 ${resolvedModel}로 다운시프트합니다.`
      );
    } else {
      reasoning.push(`${policy.label}은 이미 경량 모델 범위 안에 있습니다.`);
    }
  }

  if (policy.mode === "floor" && policy.floorModel) {
    const floored = pickHigherQualityModel(configuredModel, policy.floorModel);
    if (floored !== configuredModel) {
      reasoning.push(
        `${policy.label}은 품질과 안전 기준상 최소 ${policy.floorModel} 이상으로 유지합니다.`
      );
    }
    resolvedModel = floored;
  }

  if (input.task === "chat_stream") {
    const riskFloor = resolveRiskFloor(input.summary);
    if (riskFloor) {
      const upgraded = pickHigherQualityModel(resolvedModel, riskFloor);
      if (upgraded !== resolvedModel) {
        reasoning.push(
          `현재 상담 맥락에 안전 신호가 있어 메인 상담 모델을 ${upgraded}까지 상향합니다.`
        );
        resolvedModel = upgraded;
      } else {
        reasoning.push(
          "현재 상담 맥락에 안전 신호가 있지만 이미 그 기준 이상 모델이 선택되어 있습니다."
        );
      }
    }
  }

  if (reasoning.length === 0) {
    reasoning.push(
      "현재 작업은 기본 모델을 그대로 사용해도 비용, 속도, 품질 균형이 맞습니다."
    );
  }

  return {
    task: input.task,
    configuredModel,
    resolvedModel,
    policyLabel: policy.label,
    purpose: policy.purpose,
    reasoning,
  };
}

export function shouldPreferDeterministicSuggestions(
  summary: UserContextSummary | null | undefined
) {
  if (!summary) return false;
  return summary.safetyEscalation.level !== "routine";
}

export function buildAiGovernancePreview(configuredModel?: string | null) {
  const current = normalizeChatModel(configuredModel || DEFAULT_CHAT_MODEL);
  return (Object.keys(TASK_POLICIES) as AiGovernanceTask[]).map((task) => {
    const resolved = resolveGovernedModel({
      task,
      configuredModel: current,
    });
    return {
      task,
      label: resolved.policyLabel,
      purpose: resolved.purpose,
      configuredModel: resolved.configuredModel,
      resolvedModel: resolved.resolvedModel,
      reasoning: resolved.reasoning,
    } satisfies AiGovernancePreview;
  });
}

export function getAiGovernanceTaskOptions() {
  const supportedModels = new Set(getChatModelOptions().map((option) => option.id));
  return (Object.entries(TASK_POLICIES) as Array<
    [AiGovernanceTask, GovernanceTaskPolicy]
  >).map(([task, policy]) => ({
    task,
    label: policy.label,
    purpose: policy.purpose,
    mode: policy.mode,
    fixedModel:
      policy.fixedModel && supportedModels.has(policy.fixedModel)
        ? policy.fixedModel
        : null,
    floorModel:
      policy.floorModel && supportedModels.has(policy.floorModel)
        ? policy.floorModel
        : null,
  }));
}
