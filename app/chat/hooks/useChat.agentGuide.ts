import {
  CHAT_CAPABILITY_ACTIONS,
  type ChatActionType,
  type ChatCapabilityAction,
} from "@/lib/chat/agent-actions";
import { hasRecommendationSection } from "./useChat.agentActions";
import { scoreActionMemory, type ActionMemoryMap } from "./useChat.actionMemory";
import type { InChatAssessmentMode } from "./useChat.assessment";

export type AgentGuideExample = {
  id: string;
  label: string;
  prompt: string;
};

export type AgentCapabilityItem = ChatCapabilityAction & {
  id: string;
};

export function buildAgentCapabilityActions(input: {
  latestAssistantText: string;
  inAssessmentMode: InChatAssessmentMode | null;
  pageContextActionSet: Set<ChatActionType>;
  actionMemory: ActionMemoryMap;
}): AgentCapabilityItem[] {
  const hasRecommendation = hasRecommendationSection(input.latestAssistantText);

  const scored = CHAT_CAPABILITY_ACTIONS.map((item) => {
    let priority = 0;
    if (hasRecommendation) {
      if (item.category === "cart") priority += 60;
      if (item.type === "open_my_orders") priority += 18;
      if (item.type === "start_chat_assess") priority += 15;
    } else {
      if (item.type === "open_explore") priority += 14;
      if (item.type === "start_chat_quick_check") priority += 12;
      if (item.type === "open_my_orders") priority += 10;
    }

    if (input.inAssessmentMode === "quick") {
      if (item.type === "start_chat_quick_check") priority += 60;
      if (item.type === "open_check_ai") priority += 28;
    } else if (input.inAssessmentMode === "deep") {
      if (item.type === "start_chat_assess") priority += 60;
      if (item.type === "open_assess") priority += 28;
    }

    if (item.type === "open_contact" || item.type === "open_support_call") {
      priority += 5;
    }
    if (input.pageContextActionSet.has(item.type)) {
      priority += 35;
    }
    priority += scoreActionMemory(item.type, input.actionMemory);

    return {
      ...item,
      id: `cap-${item.type}`,
      priority,
    };
  }).sort(
    (left, right) =>
      right.priority - left.priority || left.label.localeCompare(right.label, "ko")
  );

  return scored.map(({ priority: _priority, ...item }) => item);
}

export function buildAgentGuideExamples(input: {
  latestAssistantText: string;
  pageSuggestedPrompts?: string[] | null;
  agentCapabilityActions: AgentCapabilityItem[];
}): AgentGuideExample[] {
  if (hasRecommendationSection(input.latestAssistantText)) {
    return [
      {
        id: "agent-buy-all",
        label: "추천 제품 바로 주문",
        prompt: "추천 상품 전체 바로 구매 진행해줘",
      },
      {
        id: "agent-add-all",
        label: "추천 제품 담기",
        prompt: "추천 상품 전체 장바구니에 담아줘",
      },
      {
        id: "agent-cart-and-assess",
        label: "담은 뒤 정밀검사",
        prompt: "추천 상품 장바구니에 담고 정밀검사 페이지로 이동해줘",
      },
      {
        id: "agent-open-check-ai",
        label: "빠른검사 시작하기",
        prompt: "빠른검사 시작해줘",
      },
    ];
  }

  if (
    Array.isArray(input.pageSuggestedPrompts) &&
    input.pageSuggestedPrompts.length > 0
  ) {
    return input.pageSuggestedPrompts.slice(0, 4).map((prompt, index) => ({
      id: `ctx-${index}-${prompt}`,
      label: prompt.length > 18 ? `${prompt.slice(0, 18)}...` : prompt,
      prompt,
    }));
  }

  return input.agentCapabilityActions.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.label,
    prompt: item.prompt,
  }));
}
