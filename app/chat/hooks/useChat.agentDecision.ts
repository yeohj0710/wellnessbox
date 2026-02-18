import {
  CHAT_ACTION_LABELS,
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import type { ChatMessage } from "@/types/chat";
import {
  buildSyntheticCartCommand,
  hasRecommendationSection,
  normalizeActionTypeList,
} from "./useChat.agentActions";
import type { InteractiveActionResult } from "./useChat.interactiveActions";

type CartExecutionResult = {
  executed: boolean;
  summary: string;
  hasAddress: boolean;
  openCartAfterSave?: boolean;
};

type RunAgentDecisionParams = {
  decision: ChatAgentExecuteDecision;
  sessionMessages: ChatMessage[];
  executeCartCommandText: (params: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) => Promise<CartExecutionResult>;
  runSingleInteractiveAction: (
    action: ChatActionType,
    sessionMessages: ChatMessage[]
  ) => Promise<InteractiveActionResult>;
};

const ACTION_PRIORITY: Partial<Record<ChatActionType, number>> = {
  clear_cart: 0,
  start_chat_quick_check: 1,
  start_chat_assess: 1,
  open_cart: 2,
  open_profile: 2,
  open_me: 3,
  open_my_data: 3,
  open_my_orders: 3,
  open_check_ai: 3,
  open_assess: 3,
  open_explore: 3,
  open_home: 3,
  open_home_products: 3,
  open_7day_purchase: 3,
  open_chat_page: 3,
  open_contact: 3,
  open_terms: 3,
  open_privacy: 3,
  open_refund_policy: 3,
  open_about: 3,
  open_auth_phone: 3,
  open_support_email: 3,
  open_support_call: 3,
  open_pharm_dashboard: 3,
  open_pharm_manage_products: 3,
  open_rider_dashboard: 3,
  open_admin_login: 3,
  open_admin_dashboard: 3,
};

export function normalizeExecuteDecision(raw: unknown): ChatAgentExecuteDecision {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cartIntentRaw =
    data.cartIntent && typeof data.cartIntent === "object"
      ? (data.cartIntent as Record<string, unknown>)
      : {};
  const cartIntentMode =
    cartIntentRaw.mode === "add_all" ||
    cartIntentRaw.mode === "buy_all" ||
    cartIntentRaw.mode === "add_named" ||
    cartIntentRaw.mode === "buy_named"
      ? cartIntentRaw.mode
      : "none";

  return {
    handled: data.handled === true,
    assistantReply:
      typeof data.assistantReply === "string"
        ? data.assistantReply.trim().slice(0, 240)
        : "",
    actions: normalizeActionTypeList(data.actions),
    cartIntent: {
      mode: cartIntentMode,
      targetProductName:
        typeof cartIntentRaw.targetProductName === "string"
          ? cartIntentRaw.targetProductName.trim().slice(0, 80)
          : undefined,
      quantity:
        typeof cartIntentRaw.quantity === "number"
          ? Math.max(1, Math.min(20, Math.floor(cartIntentRaw.quantity)))
          : 1,
    },
    confidence:
      typeof data.confidence === "number"
        ? Math.max(0, Math.min(1, data.confidence))
        : 0,
    reason:
      typeof data.reason === "string"
        ? data.reason.trim().slice(0, 180)
        : undefined,
  };
}

export function buildFallbackInteractiveActions(lastAssistantText: string) {
  const hasRecommendation = hasRecommendationSection(lastAssistantText);
  const base: ChatActionType[] = hasRecommendation
    ? ["add_recommended_all", "buy_recommended_all", "open_cart", "clear_cart"]
    : ["start_chat_quick_check", "open_explore", "open_my_orders", "open_contact"];

  return base.map((type) => ({
    type,
    label: CHAT_ACTION_LABELS[type],
  })) satisfies ChatAgentSuggestedAction[];
}

export async function runAgentDecision(
  params: RunAgentDecisionParams
): Promise<{ executed: boolean; summary: string; message: string }> {
  let executed = false;
  let summary = "";
  const messages: string[] = [];
  const hasClearCartAction = params.decision.actions.includes("clear_cart");

  const syntheticCommand = hasClearCartAction
    ? null
    : buildSyntheticCartCommand({
        actions: params.decision.actions,
        cartIntent: params.decision.cartIntent,
      });
  if (syntheticCommand) {
    const cartResult = await params.executeCartCommandText({
      commandText: syntheticCommand,
      sessionMessages: params.sessionMessages,
    });
    if (cartResult.executed) {
      executed = true;
      summary = cartResult.summary;
      messages.push(
        cartResult.hasAddress
          ? cartResult.openCartAfterSave
            ? "요청한 추천 제품으로 바로 구매를 진행할 수 있게 열어둘게요."
            : "요청한 추천 제품을 장바구니에 담아둘게요."
          : "주소 입력이 필요해서 주소 입력 창부터 열어둘게요."
      );
    }
  }

  const nonCartActions = params.decision.actions.filter(
    (action) => action !== "add_recommended_all" && action !== "buy_recommended_all"
  );
  const orderedNonCartActions = [...nonCartActions].sort(
    (left, right) => (ACTION_PRIORITY[left] ?? 9) - (ACTION_PRIORITY[right] ?? 9)
  );

  for (const action of orderedNonCartActions) {
    const result = await params.runSingleInteractiveAction(action, params.sessionMessages);
    if (!result.executed) continue;
    executed = true;
    if (result.summary) summary = result.summary;
    if (result.message) messages.push(result.message);
    if (result.navigated) break;
  }

  return {
    executed,
    summary,
    message:
      params.decision.assistantReply ||
      messages.find(Boolean) ||
      "요청하신 동작을 실행해둘게요.",
  };
}
