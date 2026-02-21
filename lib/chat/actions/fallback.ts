import {
  CHAT_ACTION_LABELS,
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import {
  ABOUT_REGEX,
  ADD_REGEX,
  ADMIN_DASHBOARD_REGEX,
  ADMIN_LOGIN_REGEX,
  AFFIRM_REGEX,
  ASSESS_FLOW_FOCUS_REGEX,
  BUY_REGEX,
  CART_ACTIONS,
  CHAT_MODE_REGEX,
  CHAT_PAGE_REGEX,
  CHECK_AI_FORM_FOCUS_REGEX,
  CLEAR_CART_REGEX,
  CONTACT_REGEX,
  DEEP_ASSESS_REGEX,
  EXPLORE_REGEX,
  FALLBACK_ACTION_FEEDBACK,
  GENERIC_ASSESS_REGEX,
  HOME_PRODUCTS_REGEX,
  HOME_REGEX,
  HOME_SECTION_FOCUS_REGEX,
  IN_PAGE_FOCUS_HINT_REGEX,
  LINKED_ORDER_LOOKUP_REGEX,
  MANUAL_ORDER_LOOKUP_REGEX,
  ME_ORDERS_FOCUS_REGEX,
  ME_PROFILE_FOCUS_REGEX,
  MY_DATA_ACCOUNT_FOCUS_REGEX,
  MY_DATA_ORDERS_FOCUS_REGEX,
  MY_DATA_REGEX,
  MY_ORDERS_REGEX,
  NAVIGATION_INTENT_REGEX,
  OPEN_CART_REGEX,
  OPEN_ME_REGEX,
  PHONE_AUTH_REGEX,
  PHARM_DASHBOARD_REGEX,
  PHARM_PRODUCTS_REGEX,
  PRIVACY_REGEX,
  PROFILE_REGEX,
  PURCHASE_PAGE_REGEX,
  QUICK_CHECK_REGEX,
  RECOMMENDATION_SECTION_REGEX,
  REFUND_REGEX,
  RIDER_DASHBOARD_REGEX,
  START_7DAY_REGEX,
  SUPPORT_CALL_REGEX,
  SUPPORT_EMAIL_REGEX,
  TERMS_REGEX,
  buildRuntimeContextFlags,
} from "@/lib/chat/action-intent-rules";
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
  const actions: ChatActionType[] = [];
  const pushAction = (action: ChatActionType) => {
    if (!actions.includes(action)) actions.push(action);
  };
  const prefersChatMode =
    CHAT_MODE_REGEX.test(text) && !NAVIGATION_INTENT_REGEX.test(text);
  const prefersInPageFocus =
    IN_PAGE_FOCUS_HINT_REGEX.test(text) && !NAVIGATION_INTENT_REGEX.test(text);

  if (runtimeFlags.inMyOrders && MANUAL_ORDER_LOOKUP_REGEX.test(text)) {
    pushAction("focus_manual_order_lookup");
  } else if (runtimeFlags.inMyOrders && LINKED_ORDER_LOOKUP_REGEX.test(text)) {
    pushAction("focus_linked_order_lookup");
  }

  if (
    runtimeFlags.inHomeProducts &&
    HOME_SECTION_FOCUS_REGEX.test(text) &&
    !NAVIGATION_INTENT_REGEX.test(text)
  ) {
    pushAction("focus_home_products");
  }

  if (
    runtimeFlags.inMe &&
    (ME_PROFILE_FOCUS_REGEX.test(text) ||
      (prefersInPageFocus && PROFILE_REGEX.test(text)))
  ) {
    pushAction("focus_me_profile");
  }
  if (
    runtimeFlags.inMe &&
    (ME_ORDERS_FOCUS_REGEX.test(text) ||
      (prefersInPageFocus && MY_ORDERS_REGEX.test(text)))
  ) {
    pushAction("focus_me_orders");
  }

  if (
    runtimeFlags.inMyData &&
    (MY_DATA_ACCOUNT_FOCUS_REGEX.test(text) ||
      (prefersInPageFocus && MY_DATA_REGEX.test(text)))
  ) {
    pushAction("focus_my_data_account");
  }
  if (
    runtimeFlags.inMyData &&
    (MY_DATA_ORDERS_FOCUS_REGEX.test(text) ||
      (prefersInPageFocus && MY_ORDERS_REGEX.test(text)))
  ) {
    pushAction("focus_my_data_orders");
  }

  if (
    runtimeFlags.inCheckAi &&
    CHECK_AI_FORM_FOCUS_REGEX.test(text) &&
    !NAVIGATION_INTENT_REGEX.test(text)
  ) {
    pushAction("focus_check_ai_form");
  }

  if (
    runtimeFlags.inAssess &&
    ASSESS_FLOW_FOCUS_REGEX.test(text) &&
    !NAVIGATION_INTENT_REGEX.test(text)
  ) {
    pushAction("focus_assess_flow");
  }

  let navigationAction: ChatActionType | null = null;
  if (QUICK_CHECK_REGEX.test(text) && !prefersChatMode) {
    navigationAction =
      runtimeFlags.inCheckAi && !NAVIGATION_INTENT_REGEX.test(text)
        ? "focus_check_ai_form"
        : "open_check_ai";
  } else if (
    (DEEP_ASSESS_REGEX.test(text) || GENERIC_ASSESS_REGEX.test(text)) &&
    !prefersChatMode
  ) {
    navigationAction =
      runtimeFlags.inAssess && !NAVIGATION_INTENT_REGEX.test(text)
        ? "focus_assess_flow"
        : "open_assess";
  } else if (MY_ORDERS_REGEX.test(text)) {
    if (runtimeFlags.inMe && !NAVIGATION_INTENT_REGEX.test(text)) {
      navigationAction = "focus_me_orders";
    } else if (runtimeFlags.inMyData && !NAVIGATION_INTENT_REGEX.test(text)) {
      navigationAction = "focus_my_data_orders";
    } else {
      navigationAction = "open_my_orders";
    }
  } else if (MY_DATA_REGEX.test(text)) {
    navigationAction =
      runtimeFlags.inMyData && !NAVIGATION_INTENT_REGEX.test(text)
        ? "focus_my_data_account"
        : "open_my_data";
  } else if (START_7DAY_REGEX.test(text)) {
    navigationAction = "open_7day_purchase";
  } else if (HOME_PRODUCTS_REGEX.test(text)) {
    navigationAction = runtimeFlags.inHomeProducts
      ? "focus_home_products"
      : "open_home_products";
  } else if (EXPLORE_REGEX.test(text)) {
    navigationAction = "open_explore";
  } else if (HOME_REGEX.test(text)) {
    navigationAction = "open_home";
  } else if (CHAT_PAGE_REGEX.test(text)) {
    navigationAction = "open_chat_page";
  } else if (OPEN_ME_REGEX.test(text) && !PROFILE_REGEX.test(text)) {
    navigationAction =
      runtimeFlags.inMe && !NAVIGATION_INTENT_REGEX.test(text)
        ? "focus_me_profile"
        : "open_me";
  } else if (PHONE_AUTH_REGEX.test(text)) {
    navigationAction = "open_auth_phone";
  } else if (SUPPORT_EMAIL_REGEX.test(text)) {
    navigationAction = "open_support_email";
  } else if (SUPPORT_CALL_REGEX.test(text)) {
    navigationAction = "open_support_call";
  } else if (CONTACT_REGEX.test(text)) {
    navigationAction = "open_contact";
  } else if (TERMS_REGEX.test(text)) {
    navigationAction = "open_terms";
  } else if (PRIVACY_REGEX.test(text)) {
    navigationAction = "open_privacy";
  } else if (REFUND_REGEX.test(text)) {
    navigationAction = "open_refund_policy";
  } else if (ABOUT_REGEX.test(text)) {
    navigationAction = "open_about";
  } else if (PHARM_PRODUCTS_REGEX.test(text)) {
    navigationAction = "open_pharm_manage_products";
  } else if (PHARM_DASHBOARD_REGEX.test(text)) {
    navigationAction = "open_pharm_dashboard";
  } else if (RIDER_DASHBOARD_REGEX.test(text)) {
    navigationAction = "open_rider_dashboard";
  } else if (ADMIN_LOGIN_REGEX.test(text)) {
    navigationAction = "open_admin_login";
  } else if (ADMIN_DASHBOARD_REGEX.test(text)) {
    navigationAction = "open_admin_dashboard";
  }

  if (navigationAction) {
    pushAction(navigationAction);
  }

  if (CLEAR_CART_REGEX.test(text)) {
    pushAction("clear_cart");
  }

  if (prefersChatMode && QUICK_CHECK_REGEX.test(text)) {
    pushAction("start_chat_quick_check");
  } else if (
    prefersChatMode &&
    (DEEP_ASSESS_REGEX.test(text) || GENERIC_ASSESS_REGEX.test(text))
  ) {
    pushAction("start_chat_assess");
  } else if (
    !navigationAction &&
    !CLEAR_CART_REGEX.test(text) &&
    !hasRecommendationContext &&
    GENERIC_ASSESS_REGEX.test(text)
  ) {
    pushAction("start_chat_quick_check");
  }

  if (PROFILE_REGEX.test(text) && !navigationAction) {
    pushAction("open_profile");
  }

  if (OPEN_CART_REGEX.test(text) && !navigationAction && !prefersChatMode) {
    pushAction("open_cart");
  }

  const buyIntent = BUY_REGEX.test(text) && !PURCHASE_PAGE_REGEX.test(text);
  const addIntent = ADD_REGEX.test(text);
  const affirmativeRecommendation =
    AFFIRM_REGEX.test(text) && hasRecommendationContext;
  const cartMode =
    buyIntent || addIntent || affirmativeRecommendation
      ? buyIntent
        ? "buy_all"
        : "add_all"
      : "none";

  if (actions.length === 0 && cartMode === "none") {
    return DEFAULT_EXECUTE_DECISION;
  }

  const assistantParts: string[] = [];
  if (cartMode !== "none") {
    assistantParts.push(
      cartMode === "buy_all"
        ? "추천 상품 전체를 바로 구매 흐름으로 진행해둘게요."
        : "추천 상품 전체를 장바구니에 담아둘게요."
    );
  }

  const pushedMessages = new Set<string>();
  const pushFeedback = (action: ChatActionType) => {
    const textForAction = FALLBACK_ACTION_FEEDBACK[action];
    if (!textForAction || pushedMessages.has(textForAction)) return;
    pushedMessages.add(textForAction);
    assistantParts.push(textForAction);
  };

  if (navigationAction) {
    pushFeedback(navigationAction);
  }

  for (const action of actions) {
    if (action === navigationAction) continue;
    if (action === "add_recommended_all" || action === "buy_recommended_all") {
      continue;
    }
    pushFeedback(action);
  }

  const reasons: string[] = [];
  if (cartMode !== "none") reasons.push("cart");
  if (navigationAction) reasons.push(`primary:${navigationAction}`);
  if (actions.includes("focus_home_products")) reasons.push("focus:home-products");
  if (actions.includes("focus_manual_order_lookup")) reasons.push("focus:manual-order");
  if (actions.includes("focus_linked_order_lookup")) reasons.push("focus:linked-order");
  if (actions.includes("focus_me_profile")) reasons.push("focus:me-profile");
  if (actions.includes("focus_me_orders")) reasons.push("focus:me-orders");
  if (actions.includes("focus_my_data_account")) reasons.push("focus:my-data-account");
  if (actions.includes("focus_my_data_orders")) reasons.push("focus:my-data-orders");
  if (actions.includes("focus_check_ai_form")) reasons.push("focus:check-ai-form");
  if (actions.includes("focus_assess_flow")) reasons.push("focus:assess-flow");
  if (actions.includes("clear_cart")) reasons.push("cart-clear");
  if (actions.includes("start_chat_quick_check")) reasons.push("chat-quick-check");
  if (actions.includes("start_chat_assess")) reasons.push("chat-deep-assess");

  return {
    handled: true,
    assistantReply:
      assistantParts.join(" ").trim() || "요청하신 동작을 실행해둘게요.",
    actions,
    cartIntent: {
      mode: cartMode,
    },
    confidence: cartMode !== "none" || actions.length > 0 ? 0.84 : 0.76,
    reason: `fallback: ${reasons.join(",") || "action"}`,
  };
}

export function buildFallbackSuggestedActions(
  body: SuggestBody
): ChatAgentSuggestedAction[] {
  const assistantText = toText(body.assistantText, 1400);
  const runtimeContextText = toText(body.runtimeContextText, 320);
  const runtimeFlags = buildRuntimeContextFlags(runtimeContextText);
  const hasRecommendation = RECOMMENDATION_SECTION_REGEX.test(assistantText);
  const hasAssessmentContext =
    QUICK_CHECK_REGEX.test(assistantText) ||
    DEEP_ASSESS_REGEX.test(assistantText) ||
    GENERIC_ASSESS_REGEX.test(assistantText);
  const hasSupportContext =
    CONTACT_REGEX.test(assistantText) ||
    TERMS_REGEX.test(assistantText) ||
    PRIVACY_REGEX.test(assistantText) ||
    REFUND_REGEX.test(assistantText) ||
    ABOUT_REGEX.test(assistantText);
  const hasChatAssessmentContext =
    /(대화형\s*(빠른|정밀)?\s*검사|문항|질문|chat\s*assessment)/i.test(
      assistantText
    );

  const actions: ChatActionType[] = runtimeFlags.inMyOrders
    ? ["focus_linked_order_lookup", "focus_manual_order_lookup", "open_contact", "open_me"]
    : runtimeFlags.inHomeProducts
      ? ["focus_home_products", "open_cart", "open_7day_purchase", "open_check_ai"]
      : runtimeFlags.inMe
        ? ["focus_me_profile", "focus_me_orders", "open_profile", "open_my_data"]
        : runtimeFlags.inMyData
          ? ["focus_my_data_account", "focus_my_data_orders", "open_assess", "open_my_orders"]
          : runtimeFlags.inCheckAi
            ? ["focus_check_ai_form", "start_chat_quick_check", "open_assess", "open_explore"]
            : runtimeFlags.inAssess
              ? ["focus_assess_flow", "start_chat_assess", "open_check_ai", "open_explore"]
              : hasRecommendation
                ? ["add_recommended_all", "buy_recommended_all", "open_cart", "clear_cart"]
                : hasSupportContext
                  ? ["open_contact", "open_terms", "open_privacy", "open_refund_policy"]
                  : hasChatAssessmentContext
                    ? ["start_chat_quick_check", "start_chat_assess", "open_check_ai", "open_assess"]
                    : hasAssessmentContext
                      ? ["start_chat_quick_check", "start_chat_assess", "open_check_ai", "open_assess"]
                      : ["open_explore", "open_my_orders", "open_contact", "open_terms"];

  return actions.slice(0, 4).map((type) => ({
    type,
    label: CHAT_ACTION_LABELS[type],
    confidence: 0.6,
  }));
}
