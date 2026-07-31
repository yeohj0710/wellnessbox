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
        "상담을 시작합니다. 짧게 인사하고, 이 대화에서 어떤 도움을 줄 수 있는지 한 줄로 알려주세요. 사용자는 아직 아무것도 말하지 않았으니 목표를 단정하지 말고, 제품명과 가격도 꺼내지 말아 주세요. 무엇을 도와드릴지 묻는 질문 하나로 마무리하고, 전체를 3~4문장 안에서 끝내주세요.",
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
