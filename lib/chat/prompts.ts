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
      content: `참고 근거 라벨: ${
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
        "상담을 시작합니다. user_context_summary를 바탕으로 첫 응답을 작성해 주세요. 길게 분석하지 말고, 먼저 지금 파악된 점을 짧게 말한 뒤 바로 가능한 제안이 있으면 한두 줄로 덧붙여 주세요. 확인 질문이 꼭 필요하면 마지막에 1개만 해 주세요. 사용자가 먼저 요청하지 않았다면 보고서처럼 길게 쓰지 말고, 필요할 때만 markdown 목록을 짧게 사용해 주세요.",
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
