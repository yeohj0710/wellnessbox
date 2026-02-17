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

const ADD_REGEX = /(담아|추가|장바구니|카트)/i;
const BUY_REGEX = /(바로\s*구매|구매|결제|주문)/i;
const OPEN_CART_REGEX = /(장바구니.*(열|보여)|카트.*(열|보여)|결제창.*(열|보여))/i;
const PROFILE_REGEX = /(프로필|내\s*정보|설정)/i;
const MY_ORDERS_REGEX = /(내\s*주문|주문\s*(내역|조회)|배송\s*조회)/i;
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

  if (MY_ORDERS_REGEX.test(text)) {
    return {
      handled: true,
      assistantReply: "내 주문 조회 화면으로 이동할게요.",
      actions: ["open_my_orders"],
      cartIntent: { mode: "none" },
      confidence: 0.86,
      reason: "fallback: orders intent",
    };
  }

  if (PROFILE_REGEX.test(text)) {
    return {
      handled: true,
      assistantReply: "프로필 설정 화면을 바로 열게요.",
      actions: ["open_profile"],
      cartIntent: { mode: "none" },
      confidence: 0.84,
      reason: "fallback: profile intent",
    };
  }

  if (OPEN_CART_REGEX.test(text)) {
    return {
      handled: true,
      assistantReply: "장바구니를 열어 확인할 수 있게 할게요.",
      actions: ["open_cart"],
      cartIntent: { mode: "none" },
      confidence: 0.84,
      reason: "fallback: open cart intent",
    };
  }

  const buyIntent = BUY_REGEX.test(text);
  const addIntent = ADD_REGEX.test(text);
  const affirmativeRecommendation = AFFIRM_REGEX.test(text) && hasRecommendationContext;

  if (buyIntent || addIntent || affirmativeRecommendation) {
    return {
      handled: true,
      assistantReply: buyIntent
        ? "추천 제품을 주문 흐름에 맞게 바로 처리할게요."
        : "추천 제품을 장바구니에 담아둘게요.",
      actions: [],
      cartIntent: {
        mode: buyIntent ? "buy_all" : "add_all",
      },
      confidence: buyIntent || addIntent ? 0.8 : 0.7,
      reason: "fallback: cart intent",
    };
  }

  return DEFAULT_EXECUTE_DECISION;
}

function buildFallbackSuggestedActions(
  body: SuggestBody
): ChatAgentSuggestedAction[] {
  const assistantText = toText(body.assistantText, 1400);
  const hasRecommendation = RECOMMENDATION_SECTION_REGEX.test(assistantText);

  const actions: ChatActionType[] = hasRecommendation
    ? ["add_recommended_all", "buy_recommended_all", "open_cart", "open_profile"]
    : ["open_profile", "open_my_orders", "open_cart"];

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
    "If there is no explicit actionable intent, return handled=false.",
    "If user gives short confirmation (e.g. 응/네/좋아) after recommendation context, map to add_all or buy_all intent.",
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
          "Prioritize actions that help complete recommendation -> cart -> order flow.",
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
    const decision =
      fromModel && (fromModel.handled || fromModel.actions.length > 0 || fromModel.cartIntent.mode !== "none")
        ? fromModel
        : buildFallbackExecuteDecision(executeBody);

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
