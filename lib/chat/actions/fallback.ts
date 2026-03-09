import { type ChatAgentExecuteDecision } from "@/lib/chat/agent-actions";
import {
  RECOMMENDATION_SECTION_REGEX,
  buildRuntimeContextFlags,
} from "@/lib/chat/action-intent-rules";
import {
  buildFallbackAssistantReply,
  buildFallbackReason,
  hasFallbackActionOrCartIntent,
  resolveFallbackActionDraft,
  resolveFallbackSuggestedActions,
} from "@/lib/chat/actions/fallback-support";
import {
  type ExecuteBody,
  type SuggestBody,
  DEFAULT_EXECUTE_DECISION,
  getLatestAssistantText,
  toText,
} from "@/lib/chat/actions/shared";

export function buildFallbackExecuteDecision(
  body: ExecuteBody
): ChatAgentExecuteDecision {
  const text = toText(body.text, 240);
  if (!text) return DEFAULT_EXECUTE_DECISION;

  const runtimeContextText = toText(body.runtimeContextText, 320);
  const runtimeFlags = buildRuntimeContextFlags(runtimeContextText);
  const latestAssistant = getLatestAssistantText(body.recentMessages);
  const hasRecommendationContext = RECOMMENDATION_SECTION_REGEX.test(
    latestAssistant
  );

  const draft = resolveFallbackActionDraft({
    text,
    runtimeFlags,
    hasRecommendationContext,
  });

  if (!hasFallbackActionOrCartIntent(draft)) {
    return DEFAULT_EXECUTE_DECISION;
  }

  return {
    handled: true,
    assistantReply: buildFallbackAssistantReply(draft),
    actions: draft.actions,
    cartIntent: {
      mode: draft.cartMode,
    },
    confidence:
      draft.cartMode !== "none" || draft.actions.length > 0 ? 0.84 : 0.76,
    reason: buildFallbackReason(draft),
  };
}

export function buildFallbackSuggestedActions(body: SuggestBody) {
  const assistantText = toText(body.assistantText, 1400);
  const runtimeContextText = toText(body.runtimeContextText, 320);
  const runtimeFlags = buildRuntimeContextFlags(runtimeContextText);

  return resolveFallbackSuggestedActions({
    assistantText,
    runtimeFlags,
  });
}
