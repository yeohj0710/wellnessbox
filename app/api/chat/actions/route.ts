import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";
import {
  CHAT_ACTION_LABELS,
  CHAT_ACTION_TYPES,
  type ChatActionType,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";

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
};

type SuggestBody = {
  mode: "suggest";
  assistantText?: string;
  recentMessages?: InputMessage[];
  contextSummaryText?: string;
};

const CHAT_ACTION_TYPE_SET = new Set<string>(CHAT_ACTION_TYPES);

const ADD_REGEX = /(담아|담기|추가|넣어|담아줘|담아줄래|장바구니에?\s*(담|넣|추가)|카트에?\s*(담|넣|추가))/i;
const BUY_REGEX =
  /(바로\s*구매|구매(해|할래|진행|해줘)?|결제|주문(?!\s*(내역|조회|번호))(해|할래|진행|해줘)?)/i;
const OPEN_CART_REGEX = /(장바구니.*(열|보여)|카트.*(열|보여)|결제창.*(열|보여))/i;
const CLEAR_CART_REGEX =
  /(장바구니|카트).*(비워|비우|초기화|전부\s*삭제|모두\s*삭제|싹\s*지워|clear)/i;
const PROFILE_REGEX = /(프로필\s*설정|프로필|설정)/i;
const MY_ORDERS_REGEX = /(내\s*주문|주문\s*(내역|조회)|배송\s*조회)/i;
const OPEN_ME_REGEX = /(내\s*정보|마이\s*페이지|내\s*프로필)/i;
const MY_DATA_REGEX = /(내\s*데이터|마이\s*데이터|전체\s*조회|my-data)/i;
const QUICK_CHECK_REGEX =
  /(빠른\s*검사|간단\s*검사|간편\s*검사|체크\s*ai|check\s*ai|자가\s*진단)/i;
const DEEP_ASSESS_REGEX = /(정밀\s*검사|심층\s*검사|상세\s*검사|assess)/i;
const GENERIC_ASSESS_REGEX =
  /(진단\s*검사|건강\s*검사|검사\s*진행|검사\s*페이지|검사하러|검사\s*시작)/i;
const EXPLORE_REGEX =
  /(상품\s*(목록|보기|보러|탐색|둘러)|제품\s*(목록|보기|보러|탐색)|둘러보|탐색\s*페이지|구매\s*페이지)/i;
const HOME_REGEX = /(홈(으로)?\s*(가|이동)|메인(으로)?\s*(가|이동)|첫\s*페이지)/i;
const HOME_PRODUCTS_REGEX =
  /(홈\s*상품|상품\s*섹션|home-products|상품\s*리스트|제품\s*섹션)/i;
const START_7DAY_REGEX = /(7일치\s*구매|7일\s*패키지|7일치\s*시작)/i;
const CHAT_PAGE_REGEX =
  /(채팅\s*페이지|상담\s*페이지|챗봇\s*페이지|AI\s*맞춤\s*상담|전체\s*화면\s*채팅)/i;
const ABOUT_REGEX = /(회사\s*소개|브랜드\s*소개|about)/i;
const CONTACT_REGEX = /(문의(하기)?|고객센터|contact|연락처)/i;
const TERMS_REGEX = /(이용약관|약관|terms)/i;
const PRIVACY_REGEX = /(개인정보(처리방침)?|프라이버시|privacy)/i;
const REFUND_REGEX = /(환불|취소\s*규정|refund)/i;
const PHONE_AUTH_REGEX = /(휴대폰\s*인증|전화\s*인증|otp|인증번호)/i;
const SUPPORT_EMAIL_REGEX =
  /(문의\s*메일|이메일\s*문의|support\s*email|wellnessbox\.me@gmail\.com)/i;
const SUPPORT_CALL_REGEX =
  /(전화\s*연결|전화\s*문의|고객센터\s*전화|대표\s*전화|02-?6241-?5530)/i;
const PHARM_PRODUCTS_REGEX =
  /(약국\s*상품\s*(등록|관리)|상품\s*등록\/?관리|약국\s*관리\s*상품)/i;
const PHARM_DASHBOARD_REGEX = /(약국\s*(주문\s*)?관리|pharm)/i;
const RIDER_DASHBOARD_REGEX = /(라이더|배송\s*관리|rider)/i;
const ADMIN_LOGIN_REGEX = /(관리자\s*로그인|admin\s*login)/i;
const ADMIN_DASHBOARD_REGEX = /(사이트\s*관리|관리자\s*대시보드|admin\s*dashboard)/i;
const PURCHASE_PAGE_REGEX =
  /(구매\s*페이지|구매\s*화면|상품\s*페이지|쇼핑\s*페이지|7일치\s*구매|7일\s*패키지)/i;
const CHAT_MODE_REGEX =
  /(대화로|채팅으로|여기서|페이지\s*이동\s*(말고|없이)|문항.*(물어|질문)|질문.*(해줘|해주세요)|같이\s*검사)/i;
const NAVIGATION_INTENT_REGEX = /(페이지|이동|들어가|가줘|열어|오픈|navigate|open)/i;
const AFFIRM_REGEX =
  /^(응|네|예|좋아|그래|ㅇㅇ|오케이|ok|콜|해줘|진행해|부탁해|맞아)\s*[!.?]*$/i;
const RECOMMENDATION_SECTION_REGEX =
  /추천\s*제품\s*\(7일\s*기준\s*가격\)/i;

const DEFAULT_EXECUTE_DECISION: ChatAgentExecuteDecision = {
  handled: false,
  assistantReply: "",
  actions: [],
  cartIntent: { mode: "none" },
  confidence: 0,
};
const NAVIGATION_ACTIONS = new Set<ChatActionType>([
  "open_my_orders",
  "open_me",
  "open_my_data",
  "open_check_ai",
  "open_assess",
  "open_explore",
  "open_home",
  "open_home_products",
  "open_7day_purchase",
  "open_chat_page",
  "open_about",
  "open_contact",
  "open_terms",
  "open_privacy",
  "open_refund_policy",
  "open_auth_phone",
  "open_support_email",
  "open_support_call",
  "open_pharm_dashboard",
  "open_pharm_manage_products",
  "open_rider_dashboard",
  "open_admin_login",
  "open_admin_dashboard",
]);
const CART_ACTIONS = new Set<ChatActionType>([
  "add_recommended_all",
  "buy_recommended_all",
  "open_cart",
  "clear_cart",
]);

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
  const latestAssistant = getLatestAssistantText(body.recentMessages);
  const hasRecommendationContext = RECOMMENDATION_SECTION_REGEX.test(
    latestAssistant
  );
  const actions: ChatActionType[] = [];
  const pushAction = (action: ChatActionType) => {
    if (!actions.includes(action)) actions.push(action);
  };
  const prefersChatMode = CHAT_MODE_REGEX.test(text) && !NAVIGATION_INTENT_REGEX.test(text);

  let navigationAction: ChatActionType | null = null;
  if (QUICK_CHECK_REGEX.test(text) && !prefersChatMode) {
    navigationAction = "open_check_ai";
  } else if (
    (DEEP_ASSESS_REGEX.test(text) || GENERIC_ASSESS_REGEX.test(text)) &&
    !prefersChatMode
  ) {
    navigationAction = "open_assess";
  } else if (MY_ORDERS_REGEX.test(text)) {
    navigationAction = "open_my_orders";
  } else if (MY_DATA_REGEX.test(text)) {
    navigationAction = "open_my_data";
  } else if (START_7DAY_REGEX.test(text)) {
    navigationAction = "open_7day_purchase";
  } else if (HOME_PRODUCTS_REGEX.test(text)) {
    navigationAction = "open_home_products";
  } else if (EXPLORE_REGEX.test(text)) {
    navigationAction = "open_explore";
  } else if (HOME_REGEX.test(text)) {
    navigationAction = "open_home";
  } else if (CHAT_PAGE_REGEX.test(text)) {
    navigationAction = "open_chat_page";
  } else if (OPEN_ME_REGEX.test(text) && !PROFILE_REGEX.test(text)) {
    navigationAction = "open_me";
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
        ? "추천 제품을 주문 흐름에 맞게 바로 처리할게요."
        : "추천 제품을 장바구니에 담아둘게요."
    );
  }

  if (navigationAction === "open_check_ai") {
    assistantParts.push("빠른검사 페이지로 바로 이동할게요.");
  } else if (navigationAction === "open_assess") {
    assistantParts.push("정밀검사 페이지로 바로 이동할게요.");
  } else if (navigationAction === "open_my_orders") {
    assistantParts.push("내 주문 조회 화면으로 이동할게요.");
  } else if (navigationAction === "open_my_data") {
    assistantParts.push("내 데이터 페이지로 이동할게요.");
  } else if (navigationAction === "open_7day_purchase") {
    assistantParts.push("7일치 구매 섹션으로 이동할게요.");
  } else if (navigationAction === "open_home_products") {
    assistantParts.push("홈 상품 섹션으로 이동할게요.");
  } else if (navigationAction === "open_explore") {
    assistantParts.push("상품 탐색 화면으로 이동할게요.");
  } else if (navigationAction === "open_home") {
    assistantParts.push("홈 화면으로 이동할게요.");
  } else if (navigationAction === "open_chat_page") {
    assistantParts.push("AI 맞춤 상담 전체 화면으로 이동할게요.");
  } else if (navigationAction === "open_me") {
    assistantParts.push("내 정보 화면으로 이동할게요.");
  } else if (navigationAction === "open_auth_phone") {
    assistantParts.push("전화 인증 페이지로 이동할게요.");
  } else if (navigationAction === "open_contact") {
    assistantParts.push("문의하기 페이지로 이동할게요.");
  } else if (navigationAction === "open_terms") {
    assistantParts.push("이용약관 페이지를 열게요.");
  } else if (navigationAction === "open_privacy") {
    assistantParts.push("개인정보처리방침 페이지를 열게요.");
  } else if (navigationAction === "open_refund_policy") {
    assistantParts.push("환불 규정 페이지를 열게요.");
  } else if (navigationAction === "open_about") {
    assistantParts.push("회사 소개 페이지로 이동할게요.");
  } else if (navigationAction === "open_support_email") {
    assistantParts.push("문의 이메일 작성 창을 열게요.");
  } else if (navigationAction === "open_support_call") {
    assistantParts.push("고객센터 전화 연결을 시도할게요.");
  } else if (navigationAction === "open_pharm_dashboard") {
    assistantParts.push("약국 주문 관리 페이지로 이동할게요.");
  } else if (navigationAction === "open_pharm_manage_products") {
    assistantParts.push("약국 상품 등록/관리 페이지로 이동할게요.");
  } else if (navigationAction === "open_rider_dashboard") {
    assistantParts.push("라이더 배송 관리 페이지로 이동할게요.");
  } else if (navigationAction === "open_admin_login") {
    assistantParts.push("관리자 로그인 페이지로 이동할게요.");
  } else if (navigationAction === "open_admin_dashboard") {
    assistantParts.push("사이트 관리 페이지로 이동할게요.");
  }

  if (!navigationAction && actions.includes("open_profile")) {
    assistantParts.push("프로필 설정 화면을 바로 열게요.");
  }
  if (!navigationAction && actions.includes("open_cart")) {
    assistantParts.push("장바구니를 열어 확인할 수 있게 할게요.");
  }
  if (actions.includes("clear_cart")) {
    assistantParts.push("장바구니를 비워둘게요.");
  }
  if (actions.includes("start_chat_quick_check")) {
    assistantParts.push("페이지 이동 없이 대화형 빠른검사를 시작할게요.");
  }
  if (actions.includes("start_chat_assess")) {
    assistantParts.push("페이지 이동 없이 대화형 정밀검사를 시작할게요.");
  }

  const reasons: string[] = [];
  if (cartMode !== "none") reasons.push("cart");
  if (navigationAction) reasons.push(`nav:${navigationAction}`);
  if (!navigationAction && actions.includes("open_profile")) reasons.push("profile");
  if (!navigationAction && actions.includes("open_cart")) reasons.push("cart-open");
  if (actions.includes("clear_cart")) reasons.push("cart-clear");
  if (actions.includes("start_chat_quick_check")) reasons.push("chat-quick-check");
  if (actions.includes("start_chat_assess")) reasons.push("chat-deep-assess");

  return {
    handled: true,
    assistantReply: assistantParts.join(" ").trim() || "요청하신 동작을 실행할게요.",
    actions,
    cartIntent: {
      mode: cartMode,
    },
    confidence: cartMode !== "none" || navigationAction ? 0.84 : 0.76,
    reason: `fallback: ${reasons.join(",") || "action"}`,
  };
}

function buildFallbackSuggestedActions(
  body: SuggestBody
): ChatAgentSuggestedAction[] {
  const assistantText = toText(body.assistantText, 1400);
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
  const hasChatAssessmentContext = /(대화형\s*(빠른|정밀)?검사|문항|질문)/.test(
    assistantText
  );

  const actions: ChatActionType[] = hasRecommendation
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

  const systemPrompt = [
    "You are a chat UI action planner for a Korean supplement commerce assistant.",
    "Decide if the user message should trigger immediate UI actions.",
    "Only use actions from this allowed list:",
    CHAT_ACTION_TYPES.join(", "),
    "Never invent a new action type outside the allowed list.",
    "If there is no explicit actionable intent, return handled=false.",
    "If user gives short confirmation (e.g. 응/네/좋아) after recommendation context, map to add_all or buy_all intent.",
    "If a message has mixed intents, keep cartIntent and include at most one navigation action.",
    "Map quick-check intent to open_check_ai and deep/general diagnosis intent to open_assess.",
    "Map policy/support intents (문의, 약관, 개인정보, 환불, 이메일, 전화) to matching open_* support actions.",
    "Map account/menu intents (내 데이터, 내 정보, 주문 조회, 홈/탐색/7일치 구매) to matching navigation actions.",
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
