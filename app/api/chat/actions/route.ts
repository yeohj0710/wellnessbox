import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";
import {
  CHAT_ACTION_LABELS,
  CHAT_ACTION_TYPES,
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import {
  ADD_REGEX,
  ADMIN_DASHBOARD_REGEX,
  ADMIN_LOGIN_REGEX,
  AFFIRM_REGEX,
  ABOUT_REGEX,
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
  NAVIGATION_ACTIONS,
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

export const runtime = "nodejs";

type InputMessage = {
  role?: string | null;
  content?: unknown;
};

type ExecuteBody = {
  mode?: "execute";
  text?: string;
  recentMessages?: InputMessage[];
  contextSummaryText?: string;
  runtimeContextText?: string;
};

type SuggestBody = {
  mode: "suggest";
  assistantText?: string;
  recentMessages?: InputMessage[];
  contextSummaryText?: string;
  runtimeContextText?: string;
};

const CHAT_ACTION_TYPE_SET = new Set<string>(CHAT_ACTION_TYPES);

const DEFAULT_EXECUTE_DECISION: ChatAgentExecuteDecision = {
  handled: false,
  assistantReply: "",
  actions: [],
  cartIntent: { mode: "none" },
  confidence: 0,
};

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

function toText(value: unknown, maxLength = 4000) {
  const raw =
    typeof value === "string"
      ? value
      : value == null
        ? ""
        : JSON.stringify(value);
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeActionTypeList(value: unknown): ChatActionType[] {
  if (!Array.isArray(value)) return [];
  const deduped: ChatActionType[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const key = toText(item, 64);
    if (!key || !CHAT_ACTION_TYPE_SET.has(key) || seen.has(key)) continue;
    seen.add(key);
    deduped.push(key as ChatActionType);
  }
  return deduped;
}

function normalizeConfidence(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

function normalizeQuantity(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(num) || num <= 0) return 1;
  return Math.min(20, Math.floor(num));
}

function normalizeExecuteDecision(value: unknown): ChatAgentExecuteDecision {
  if (!value || typeof value !== "object") return DEFAULT_EXECUTE_DECISION;
  const raw = value as Record<string, unknown>;
  const cartIntentRaw =
    raw.cartIntent && typeof raw.cartIntent === "object"
      ? (raw.cartIntent as Record<string, unknown>)
      : {};
  const mode = toText(cartIntentRaw.mode, 32);
  const normalizedMode =
    mode === "add_all" ||
    mode === "buy_all" ||
    mode === "add_named" ||
    mode === "buy_named"
      ? mode
      : "none";

  return {
    handled: raw.handled === true,
    assistantReply: toText(raw.assistantReply, 240),
    actions: normalizeActionTypeList(raw.actions),
    cartIntent: {
      mode: normalizedMode,
      targetProductName: toText(cartIntentRaw.targetProductName, 80) || undefined,
      quantity: normalizeQuantity(cartIntentRaw.quantity),
    },
    confidence: normalizeConfidence(raw.confidence),
    reason: toText(raw.reason, 180) || undefined,
  };
}

function mergeActionList(
  primary: ChatActionType[],
  secondary: ChatActionType[]
): ChatActionType[] {
  const primaryNavigation = primary.find((action) => NAVIGATION_ACTIONS.has(action));
  const secondaryNavigation = secondary.find((action) =>
    NAVIGATION_ACTIONS.has(action)
  );
  const selectedNavigation = primaryNavigation ?? secondaryNavigation ?? null;

  const out: ChatActionType[] = [];
  const seen = new Set<ChatActionType>();
  const push = (action: ChatActionType) => {
    if (NAVIGATION_ACTIONS.has(action) && selectedNavigation && action !== selectedNavigation) {
      return;
    }
    if (seen.has(action)) return;
    seen.add(action);
    out.push(action);
  };

  for (const action of primary) push(action);
  for (const action of secondary) push(action);
  return out;
}

function mergeExecuteDecision(
  preferred: ChatAgentExecuteDecision | null | undefined,
  fallback: ChatAgentExecuteDecision
): ChatAgentExecuteDecision {
  const base = preferred ?? DEFAULT_EXECUTE_DECISION;
  const cartIntent =
    base.cartIntent.mode !== "none" ? base.cartIntent : fallback.cartIntent;
  return {
    handled: base.handled || fallback.handled,
    assistantReply: base.assistantReply || fallback.assistantReply,
    actions: mergeActionList(base.actions, fallback.actions),
    cartIntent,
    confidence: Math.max(base.confidence || 0, fallback.confidence || 0),
    reason: [base.reason, fallback.reason].filter(Boolean).join(" | ") || undefined,
  };
}

function hasExplicitCartSignal(text: string) {
  return (
    ADD_REGEX.test(text) ||
    BUY_REGEX.test(text) ||
    OPEN_CART_REGEX.test(text) ||
    CLEAR_CART_REGEX.test(text)
  );
}

function sanitizeDecisionByText(
  text: string,
  decision: ChatAgentExecuteDecision
): ChatAgentExecuteDecision {
  if (decision.actions.includes("clear_cart")) {
    return {
      ...decision,
      actions: decision.actions.filter(
        (action) => action !== "add_recommended_all" && action !== "buy_recommended_all"
      ),
      cartIntent: { mode: "none" },
    };
  }

  const navigationAction = decision.actions.find((action) =>
    NAVIGATION_ACTIONS.has(action)
  );
  if (!navigationAction) return decision;
  if (hasExplicitCartSignal(text)) return decision;

  const actions = decision.actions.filter((action) => !CART_ACTIONS.has(action));
  return {
    ...decision,
    actions,
    cartIntent: { mode: "none" },
  };
}

function buildTranscript(messages: InputMessage[] | undefined, max = 8) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  const sliced = messages.slice(-max);
  return sliced
    .map((message) => {
      const role = message?.role === "assistant" ? "assistant" : "user";
      const text = toText(message?.content, 240);
      if (!text) return "";
      return `${role}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function getLatestAssistantText(messages: InputMessage[] | undefined) {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index];
    if (item?.role !== "assistant") continue;
    const text = toText(item?.content, 1200);
    if (!text) continue;
    return text;
  }
  return "";
}

function buildFallbackExecuteDecision(body: ExecuteBody): ChatAgentExecuteDecision {
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
  const prefersChatMode = CHAT_MODE_REGEX.test(text) && !NAVIGATION_INTENT_REGEX.test(text);
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
    (ME_PROFILE_FOCUS_REGEX.test(text) || (prefersInPageFocus && PROFILE_REGEX.test(text)))
  ) {
    pushAction("focus_me_profile");
  }
  if (
    runtimeFlags.inMe &&
    (ME_ORDERS_FOCUS_REGEX.test(text) || (prefersInPageFocus && MY_ORDERS_REGEX.test(text)))
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
  } else if (prefersChatMode && (DEEP_ASSESS_REGEX.test(text) || GENERIC_ASSESS_REGEX.test(text))) {
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
  const affirmativeRecommendation = AFFIRM_REGEX.test(text) && hasRecommendationContext;
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
    assistantReply: assistantParts.join(" ").trim() || "요청하신 동작을 실행해둘게요.",
    actions,
    cartIntent: {
      mode: cartMode,
    },
    confidence: cartMode !== "none" || actions.length > 0 ? 0.84 : 0.76,
    reason: `fallback: ${reasons.join(",") || "action"}`,
  };
}

function buildFallbackSuggestedActions(
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
    ? [
        "focus_linked_order_lookup",
        "focus_manual_order_lookup",
        "open_contact",
        "open_me",
      ]
    : runtimeFlags.inHomeProducts
      ? ["focus_home_products", "open_cart", "open_7day_purchase", "open_check_ai"]
      : runtimeFlags.inMe
        ? ["focus_me_profile", "focus_me_orders", "open_profile", "open_my_data"]
        : runtimeFlags.inMyData
          ? [
              "focus_my_data_account",
              "focus_my_data_orders",
              "open_assess",
              "open_my_orders",
            ]
          : runtimeFlags.inCheckAi
            ? [
                "focus_check_ai_form",
                "start_chat_quick_check",
                "open_assess",
                "open_explore",
              ]
            : runtimeFlags.inAssess
              ? [
                  "focus_assess_flow",
                  "start_chat_assess",
                  "open_check_ai",
                  "open_explore",
                ]
              : hasRecommendation
                ? ["add_recommended_all", "buy_recommended_all", "open_cart", "clear_cart"]
                : hasSupportContext
                  ? ["open_contact", "open_terms", "open_privacy", "open_refund_policy"]
                  : hasChatAssessmentContext
                    ? [
                        "start_chat_quick_check",
                        "start_chat_assess",
                        "open_check_ai",
                        "open_assess",
                      ]
                    : hasAssessmentContext
                      ? [
                          "start_chat_quick_check",
                          "start_chat_assess",
                          "open_check_ai",
                          "open_assess",
                        ]
                      : ["open_explore", "open_my_orders", "open_contact", "open_terms"];

  return actions.slice(0, 4).map((type) => ({
    type,
    label: CHAT_ACTION_LABELS[type],
    confidence: 0.6,
  }));
}

async function callOpenAI(apiKey: string, payload: unknown, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function decideExecuteByModel(body: ExecuteBody) {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;

  const text = toText(body.text, 240);
  if (!text) return null;

  const transcript = buildTranscript(body.recentMessages, 8);
  const context = toText(body.contextSummaryText, 600);
  const runtimeContextText = toText(body.runtimeContextText, 320);

  const systemPrompt = [
    "You are a chat UI action planner for a Korean supplement commerce assistant.",
    "Decide if the user message should trigger immediate UI actions.",
    "Only use actions from this allowed list:",
    CHAT_ACTION_TYPES.join(", "),
    "Never invent a new action type outside the allowed list.",
    "If there is no explicit actionable intent, return handled=false.",
    'If user gives short confirmation (e.g. "응", "좋아") after recommendation context, map to add_all or buy_all intent.',
    "If a message has mixed intents, keep cartIntent and include at most one navigation action.",
    "Map quick-check intent to open_check_ai and deep/general diagnosis intent to open_assess.",
    "Map policy/support intents (문의, 약관, 개인정보, 환불, 이메일, 전화) to matching open_* support actions.",
    "Map account/menu intents (내 정보, 내 데이터, 주문 조회, 탐색/7일치 구매) to matching navigation actions.",
    "If runtime context indicates my-orders page, prioritize focus_linked_order_lookup or focus_manual_order_lookup.",
    "If runtime context indicates home/explore product browsing, prioritize focus_home_products for in-page request.",
    "If runtime context is /me, prioritize focus_me_profile or focus_me_orders for in-page request.",
    "If runtime context is /my-data, prioritize focus_my_data_account or focus_my_data_orders for in-page request.",
    "If runtime context is /check-ai, prioritize focus_check_ai_form for in-page request.",
    "If runtime context is /assess, prioritize focus_assess_flow for in-page request.",
    "Do not drop diagnosis/navigation intent even when cart intent also exists.",
    "If user asks to run diagnosis in chat (대화로/채팅으로/여기서), use start_chat_quick_check or start_chat_assess instead of navigation.",
    "If user asks to clear cart, use clear_cart action.",
    "Return JSON object only.",
  ].join("\n");

  const userPrompt = [
    "[User Message]",
    text,
    "",
    "[Recent Transcript]",
    transcript || "(empty)",
    "",
    "[Context Summary]",
    context || "(empty)",
    "",
    "[Runtime Context]",
    runtimeContextText || "(empty)",
    "",
    "[JSON Schema]",
    `{
  "handled": boolean,
  "assistantReply": string,
  "actions": ChatActionType[],
  "cartIntent": {
    "mode": "none" | "add_all" | "buy_all" | "add_named" | "buy_named",
    "targetProductName": string,
    "quantity": number
  },
  "confidence": number,
  "reason": string
}`,
  ].join("\n");

  const payload = {
    model: await getDefaultModel(),
    temperature: 0.1,
    max_tokens: 220,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  const response = await callOpenAI(apiKey, payload, 9000);
  if (!response.ok) return null;
  const json = await response.json().catch(() => ({}));
  const content = toText(json?.choices?.[0]?.message?.content, 4000);
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return normalizeExecuteDecision(parsed);
  } catch {
    return null;
  }
}

async function suggestActionsByModel(body: SuggestBody) {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;

  const assistantText = toText(body.assistantText, 1400);
  if (!assistantText) return null;
  const transcript = buildTranscript(body.recentMessages, 8);
  const context = toText(body.contextSummaryText, 500);
  const runtimeContextText = toText(body.runtimeContextText, 320);

  const payload = {
    model: await getDefaultModel(),
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system",
        content: [
          "You select up to 4 quick UI actions for a Korean chat assistant.",
          "Only use action types from:",
          CHAT_ACTION_TYPES.join(", "),
          "Never invent unsupported action types.",
          "Prioritize actions that help complete recommendation -> cart -> order flow.",
          "When conversation asks diagnosis/test flow, prioritize open_check_ai and open_assess.",
          "For chat-based diagnosis flow, prioritize start_chat_quick_check or start_chat_assess.",
          "If runtime context is my-orders, prioritize focus_linked_order_lookup and focus_manual_order_lookup.",
          "If runtime context is home product browsing, prioritize focus_home_products before route navigation.",
          "If runtime context is /me, prioritize focus_me_profile and focus_me_orders.",
          "If runtime context is /my-data, prioritize focus_my_data_account and focus_my_data_orders.",
          "If runtime context is /check-ai, prioritize focus_check_ai_form.",
          "If runtime context is /assess, prioritize focus_assess_flow.",
          "When no recommendation context exists, include at least one navigation or support action when relevant.",
          "Return JSON object only.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "[Assistant Reply]",
          assistantText,
          "",
          "[Recent Transcript]",
          transcript || "(empty)",
          "",
          "[Context Summary]",
          context || "(empty)",
          "",
          "[Runtime Context]",
          runtimeContextText || "(empty)",
          "",
          '[Return Format] {"uiActions":[{"type":"...", "reason":"...", "confidence":0.0}]}',
        ].join("\n"),
      },
    ],
  };

  const response = await callOpenAI(apiKey, payload, 8500);
  if (!response.ok) return null;
  const json = await response.json().catch(() => ({}));
  const content = toText(json?.choices?.[0]?.message?.content, 4000);
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { uiActions?: Array<Record<string, unknown>> };
    if (!Array.isArray(parsed.uiActions)) return [];

    const selected = normalizeActionTypeList(
      parsed.uiActions.map((item) => item?.type)
    ).slice(0, 4);

    return selected.map((type) => {
      const row =
        parsed.uiActions?.find((item) => toText(item?.type, 64) === type) || {};
      return {
        type,
        label: CHAT_ACTION_LABELS[type],
        reason: toText(row.reason, 120) || undefined,
        confidence: normalizeConfidence(row.confidence) || undefined,
      } satisfies ChatAgentSuggestedAction;
    });
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExecuteBody | SuggestBody;
    const mode = body?.mode === "suggest" ? "suggest" : "execute";

    if (mode === "suggest") {
      const suggestBody = body as SuggestBody;
      const fromModel = await suggestActionsByModel(suggestBody);
      const uiActions =
        Array.isArray(fromModel) && fromModel.length > 0
          ? fromModel
          : buildFallbackSuggestedActions(suggestBody);
      return new Response(JSON.stringify({ uiActions }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const executeBody = body as ExecuteBody;
    const fromModel = await decideExecuteByModel(executeBody);
    const fallbackDecision = buildFallbackExecuteDecision(executeBody);
    const merged = mergeExecuteDecision(fromModel, fallbackDecision);
    const decision = sanitizeDecisionByText(
      toText(executeBody.text, 240),
      merged
    );
    if (
      !decision.handled &&
      decision.actions.length === 0 &&
      decision.cartIntent.mode === "none"
    ) {
      return new Response(JSON.stringify(DEFAULT_EXECUTE_DECISION), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(decision), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ...DEFAULT_EXECUTE_DECISION,
        error: error?.message || "Unknown error",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
