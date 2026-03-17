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
      content: `context_evidence_labels: ${
        input.contextSummary.evidenceLabels.join(", ") || "none"
      }\nmissing_data: ${
        input.contextSummary.missingData.join(", ") || "none"
      }\nexplainability_confidence: ${
        input.contextSummary.explainability.confidenceLabel
      }\nkey_fit_reasons: ${
        input.contextSummary.explainability.fitReasons.join(" / ") || "none"
      }\nuncertainty_notes: ${
        input.contextSummary.explainability.uncertaintyNotes.join(" / ") ||
        "none"
      }\npharmacist_review_points: ${
        input.contextSummary.explainability.pharmacistReviewPoints.join(" / ") ||
        "none"
      }\nsafety_escalation_level: ${
        input.contextSummary.safetyEscalation.level
      }\nsafety_escalation_headline: ${
        input.contextSummary.safetyEscalation.headline || "none"
      }\nsafety_reason_lines: ${
        input.contextSummary.safetyEscalation.reasonLines.join(" / ") || "none"
      }\nneeds_more_info: ${
        input.contextSummary.safetyEscalation.needsMoreInfo.join(" / ") || "none"
      }\ncautious_expression_guide: ${
        input.contextSummary.safetyEscalation.cautiousExpressionGuide.join(" / ") ||
        "none"
      }\nconsultation_impact_stage: ${
        input.contextSummary.consultationImpact.stage
      }\nconsultation_impact_headline: ${
        input.contextSummary.consultationImpact.headline || "none"
      }\nconsultation_impact_insight: ${
        input.contextSummary.consultationImpact.insight || "none"
      }\nconsultation_impact_action: ${
        input.contextSummary.consultationImpact.recommendedActionLabel || "none"
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
        "상담을 시작합니다. user_context_summary를 바탕으로 첫 응답을 작성해 주세요. 길게 분석하지 말고, 먼저 지금 파악된 점을 짧게 말한 뒤 바로 가능한 제안을 주세요. 확인 질문이 꼭 필요하면 마지막에 1개만 해주세요. 사용자가 먼저 요청하지 않았다면 보고서처럼 길게 쓰지 말고, 필요할 때만 markdown 목록을 사용해 주세요.",
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
