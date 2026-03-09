import {
  buildPromptContextPayload,
  cleanPromptLine,
  normalizePromptChatHistory,
} from "./prompt-helpers";
import {
  buildSuggestionMessages,
  buildSuggestionTopicClassifierMessages,
  buildTitleMessages,
} from "./prompt-followups";
import { buildSystemPrompt } from "./prompt-system";
import type { BuildMessagesInput, PromptMessage } from "./prompt-types";

export type {
  BuildMessagesInput,
  BuildSuggestionPromptInput,
  BuildSystemPromptInput,
  PromptHistoryMessage,
  PromptMessage,
  PromptRole,
} from "./prompt-types";
export {
  buildSuggestionMessages,
  buildSuggestionTopicClassifierMessages,
  buildSystemPrompt,
  buildTitleMessages,
};

export function buildMessages(input: BuildMessagesInput): PromptMessage[] {
  const maxHistoryMessages = Math.max(2, input.maxHistoryMessages ?? 24);
  const contextPayload = buildPromptContextPayload(
    input.contextSummary,
    input.knownContext,
    input.productBrief,
    input.runtimeContextText
  );

  const messages: PromptMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        mode: input.mode,
        hasRagContext: Boolean(input.ragText),
        summary: input.contextSummary,
      }),
    },
    {
      role: "system",
      content: `user_context_summary_json:\n${JSON.stringify(contextPayload, null, 2)}`,
    },
    {
      role: "system",
      content: `내부 참고 라벨: ${
        input.contextSummary.evidenceLabels.join(", ") || "없음"
      }\n추가 확인 필요 항목: ${
        input.contextSummary.missingData.join(", ") || "없음"
      }`,
    },
  ];

  if (input.ragText) {
    messages.push({
      role: "system",
      content: `rag_context:\n${input.ragText}`,
    });
  }

  if (input.ragSourcesJson) {
    messages.push({
      role: "system",
      content: `rag_sources_json: ${input.ragSourcesJson}`,
    });
  }

  if (input.mode === "init") {
    messages.push({
      role: "user",
      content:
        "상담을 시작합니다. user_context_summary를 바탕으로 초기 답변을 작성해 주세요. 반드시 '개인별 분석 -> 실행 계획 -> 추가 확인 -> 추천 제품(7일 기준 가격)' 순서를 지키고, 문항+응답 기반 해석을 2개 이상 포함해 주세요. 영양소 설명은 반복하지 말고 우선순위 2~3개만 제시해 주세요.",
    });
    return messages;
  }

  const history = normalizePromptChatHistory(input.chatHistory, maxHistoryMessages);
  if (history.length > 0) {
    return messages.concat(history);
  }

  messages.push({
    role: "user",
    content: cleanPromptLine(input.userText || "") || "상담을 이어가 주세요.",
  });

  return messages;
}
