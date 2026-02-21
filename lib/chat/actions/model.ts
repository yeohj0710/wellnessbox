import { getDefaultModel } from "@/lib/ai/model";
import {
  CHAT_ACTION_LABELS,
  CHAT_ACTION_TYPES,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import { buildTranscript, getOpenAIKey, normalizeActionTypeList, normalizeConfidence, normalizeExecuteDecision, toText, type ExecuteBody, type SuggestBody } from "@/lib/chat/actions/shared";

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

export async function decideExecuteByModel(
  body: ExecuteBody
): Promise<ChatAgentExecuteDecision | null> {
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

export async function suggestActionsByModel(
  body: SuggestBody
): Promise<ChatAgentSuggestedAction[] | null> {
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
