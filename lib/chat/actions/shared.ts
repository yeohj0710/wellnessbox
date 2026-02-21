import {
  type ChatActionType,
  type ChatAgentExecuteDecision,
  CHAT_ACTION_TYPES,
} from "@/lib/chat/agent-actions";
import {
  ADD_REGEX,
  BUY_REGEX,
  CART_ACTIONS,
  CLEAR_CART_REGEX,
  NAVIGATION_ACTIONS,
  OPEN_CART_REGEX,
} from "@/lib/chat/action-intent-rules";

export type InputMessage = {
  role?: string | null;
  content?: unknown;
};

export type ExecuteBody = {
  mode?: "execute";
  text?: string;
  recentMessages?: InputMessage[];
  contextSummaryText?: string;
  runtimeContextText?: string;
};

export type SuggestBody = {
  mode: "suggest";
  assistantText?: string;
  recentMessages?: InputMessage[];
  contextSummaryText?: string;
  runtimeContextText?: string;
};

const CHAT_ACTION_TYPE_SET = new Set<string>(CHAT_ACTION_TYPES);

export const DEFAULT_EXECUTE_DECISION: ChatAgentExecuteDecision = {
  handled: false,
  assistantReply: "",
  actions: [],
  cartIntent: { mode: "none" },
  confidence: 0,
};

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

export function toText(value: unknown, maxLength = 4000) {
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

export function normalizeActionTypeList(value: unknown): ChatActionType[] {
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

export function normalizeConfidence(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

export function normalizeQuantity(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(num) || num <= 0) return 1;
  return Math.min(20, Math.floor(num));
}

export function normalizeExecuteDecision(
  value: unknown
): ChatAgentExecuteDecision {
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

export function mergeExecuteDecision(
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

export function sanitizeDecisionByText(
  text: string,
  decision: ChatAgentExecuteDecision
): ChatAgentExecuteDecision {
  if (decision.actions.includes("clear_cart")) {
    return {
      ...decision,
      actions: decision.actions.filter(
        (action) =>
          action !== "add_recommended_all" && action !== "buy_recommended_all"
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

export function buildTranscript(messages: InputMessage[] | undefined, max = 8) {
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

export function getLatestAssistantText(messages: InputMessage[] | undefined) {
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
