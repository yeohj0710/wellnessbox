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
  mode: "inherit";
};

const TASK_POLICIES: Record<AiGovernanceTask, GovernanceTaskPolicy> = {
  chat_stream: {
    label: "메인 상담",
    purpose: "사용자와 직접 대화하는 핵심 상담 응답",
    mode: "inherit",
  },
  chat_title: {
    label: "채팅 제목 생성",
    purpose: "짧은 제목 요약처럼 속도와 비용이 중요한 보조 작업",
    mode: "inherit",
  },
  chat_action_planner: {
    label: "채팅 액션 플래너",
    purpose: "짧은 JSON 분류와 UI 액션 결정",
    mode: "inherit",
  },
  chat_action_suggestions: {
    label: "후속 액션 제안",
    purpose: "짧은 후속 질문과 CTA 제안 생성",
    mode: "inherit",
  },
  chat_topic_classifier: {
    label: "주제 분류",
    purpose: "짧은 주제 추출과 라우팅 보조",
    mode: "inherit",
  },
  nhis_summary: {
    label: "건강링크 요약",
    purpose: "건강검진·복약 데이터를 바탕으로 한 안전 민감 요약",
    mode: "inherit",
  },
  b2b_evaluation: {
    label: "B2B 평가 브리핑",
    purpose: "내부 리포트용 구조화 요약과 행동 문장 생성",
    mode: "inherit",
  },
  agent_playground: {
    label: "에이전트 플레이그라운드",
    purpose: "관리자 실험과 비교 실행 환경",
    mode: "inherit",
  },
};

export function resolveGovernedModel(input: {
  task: AiGovernanceTask;
  configuredModel?: string | null;
  summary?: UserContextSummary | null;
}): AiGovernanceResolution {
  const configuredModel = normalizeChatModel(
    input.configuredModel || DEFAULT_CHAT_MODEL
  );
  const policy = TASK_POLICIES[input.task];
  const reasoning = ["관리자에서 선택한 기본 모델을 이 작업에도 그대로 사용합니다."];
  const resolvedModel = configuredModel;

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
  return (Object.entries(TASK_POLICIES) as Array<
    [AiGovernanceTask, GovernanceTaskPolicy]
  >).map(([task, policy]) => ({
    task,
    label: policy.label,
    purpose: policy.purpose,
    mode: policy.mode,
    fixedModel: null,
    floorModel: null,
  }));
}
