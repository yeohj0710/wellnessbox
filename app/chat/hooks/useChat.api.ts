import type { ChatMessage } from "@/types/chat";
import {
  CHAT_ACTION_LABELS,
  type ChatAgentExecuteDecision,
  type ChatAgentSuggestedAction,
} from "@/lib/chat/agent-actions";
import { normalizeActionTypeList } from "./useChat.agentActions";
import { normalizeExecuteDecision } from "./useChat.agentDecision";
import { DEFAULT_CHAT_TITLE } from "./useChat.session";

type RuntimeContextPayload = {
  routeKey?: string;
  routePath?: string;
  pageTitle?: string;
  pageSummary?: string;
  suggestedPrompts?: string[];
  runtimeContextText?: string;
} | null;

function buildRuntimeContextPayload(runtimeContext: RuntimeContextPayload) {
  if (!runtimeContext) return undefined;
  return {
    routeKey: runtimeContext.routeKey,
    routePath: runtimeContext.routePath,
    pageTitle: runtimeContext.pageTitle,
    pageSummary: runtimeContext.pageSummary,
    suggestedPrompts: runtimeContext.suggestedPrompts,
    runtimeContextText: runtimeContext.runtimeContextText,
  };
}

function mapSuggestedActionRows(rows: unknown[]): ChatAgentSuggestedAction[] {
  return normalizeActionTypeList(
    rows.map((item) =>
      item && typeof item === "object"
        ? (item as { type?: unknown }).type
        : undefined
    )
  ).map((type) => {
    const row = rows.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === type
    ) as
      | {
          label?: unknown;
          reason?: unknown;
          confidence?: unknown;
        }
      | undefined;

    return {
      type,
      label:
        typeof row?.label === "string" && row.label.trim()
          ? row.label.trim().slice(0, 40)
          : CHAT_ACTION_LABELS[type],
      reason:
        typeof row?.reason === "string"
          ? row.reason.trim().slice(0, 120)
          : undefined,
      confidence:
        typeof row?.confidence === "number"
          ? Math.max(0, Math.min(1, row.confidence))
          : undefined,
    } satisfies ChatAgentSuggestedAction;
  });
}

export async function requestChatTitle(params: {
  firstUserMessage: string;
  firstAssistantMessage: string;
  assistantReply: string;
}) {
  const response = await fetch("/api/chat/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const json = await response.json().catch(() => ({}));
  if (typeof json?.title === "string" && json.title.trim()) {
    return json.title.trim();
  }
  return DEFAULT_CHAT_TITLE;
}

export async function requestChatSuggestions(params: {
  text: string;
  recentMessages: ChatMessage[];
  contextPayload: Record<string, unknown>;
  runtimeContextText: string;
  excludeSuggestions: string[];
  count: number;
}) {
  const response = await fetch("/api/chat/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      ...params.contextPayload,
      runtimeContextText: params.runtimeContextText,
      recentMessages: params.recentMessages,
      excludeSuggestions: params.excludeSuggestions,
      count: params.count,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!Array.isArray(json?.suggestions)) return [];

  return json.suggestions
    .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function requestActionSuggestions(params: {
  assistantText: string;
  recentMessages: ChatMessage[];
  contextSummaryText: string;
  runtimeContextText: string;
}) {
  const response = await fetch("/api/chat/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "suggest",
      assistantText: params.assistantText,
      recentMessages: params.recentMessages,
      contextSummaryText: params.contextSummaryText,
      runtimeContextText: params.runtimeContextText,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = await response.json().catch(() => ({}));
  const rows = Array.isArray(json?.uiActions) ? json.uiActions : [];
  return mapSuggestedActionRows(rows);
}

export async function requestActionExecutionDecision(params: {
  text: string;
  recentMessages: ChatMessage[];
  contextSummaryText: string;
  runtimeContextText: string;
}): Promise<ChatAgentExecuteDecision> {
  const response = await fetch("/api/chat/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "execute",
      text: params.text,
      recentMessages: params.recentMessages,
      contextSummaryText: params.contextSummaryText,
      runtimeContextText: params.runtimeContextText,
    }),
  });

  const json = await response.json().catch(() => ({}));
  return normalizeExecuteDecision(json);
}

export async function requestChatStream(params: {
  mode: "chat" | "init";
  messages: ChatMessage[];
  clientId: string;
  contextPayload: Record<string, unknown>;
  runtimeContext: RuntimeContextPayload;
  signal: AbortSignal;
}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      clientId: params.clientId,
      mode: params.mode,
      runtimeContext: buildRuntimeContextPayload(params.runtimeContext),
      ...params.contextPayload,
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(
      params.mode === "init"
        ? "초기 메시지를 받아오지 못했어요."
        : "대화를 이어받지 못했어요."
    );
  }

  return response;
}
