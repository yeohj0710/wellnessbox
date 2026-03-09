import type { UserContextSummary } from "@/lib/chat/context";
import { toPlainText } from "@/lib/chat/context";
import type { PromptHistoryMessage, PromptMessage } from "./prompt-types";

export function cleanPromptLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function clipPromptText(text: string, max = 300) {
  const cleaned = cleanPromptLine(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export function formatPromptHistory(
  messages: PromptHistoryMessage[] | undefined,
  max = 6
) {
  if (!Array.isArray(messages)) return "";

  return messages
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-max)
    .map((message) => {
      const who = message.role === "user" ? "사용자" : "AI";
      const text = clipPromptText(toPlainText(message.content), 180);
      return text ? `${who}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function buildPromptContextPayload(
  summary: UserContextSummary,
  knownContext?: string,
  productBrief?: string,
  runtimeContextText?: string
) {
  return {
    version: summary.version,
    evidence_labels: summary.evidenceLabels,
    missing_data: summary.missingData,
    summary_text: summary.promptSummaryText,
    profile: summary.profile,
    recent_orders: summary.recentOrders,
    latest_assess: summary.latestAssess,
    latest_quick: summary.latestQuick,
    previous_consultations: summary.previousConsultations,
    actor_context: summary.actorContext,
    recommended_nutrients: summary.recommendedNutrients,
    notable_responses: summary.notableResponses,
    known_context: knownContext || undefined,
    product_catalog_brief: productBrief || undefined,
    runtime_context: runtimeContextText || undefined,
  };
}

export function normalizePromptChatHistory(
  history: PromptHistoryMessage[] | undefined,
  maxHistoryMessages: number
): PromptMessage[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  return history
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-maxHistoryMessages)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: clipPromptText(toPlainText(message.content), 4000),
    }))
    .filter((message) => Boolean(message.content));
}
