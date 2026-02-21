"use client";

import {
  buildDataDrivenSuggestions,
  type UserContextSummary,
} from "@/lib/chat/context";
import type { ChatAgentSuggestedAction } from "@/lib/chat/agent-actions";
import type { ChatSession } from "@/types/chat";
import { buildFallbackInteractiveActions } from "./useChat.agentDecision";
import {
  buildFinalSuggestions,
  getSuggestionHistory,
  rememberSuggestions,
} from "./useChat.suggestions";
import { sortActionsByMemory, type ActionMemoryMap } from "./useChat.actionMemory";

type FetchSuggestionsForSessionParams = {
  sessionId: string;
  sessions: ChatSession[];
  lastAssistantText: string;
  runtimeContextText: string;
  suggestionHistoryStore: Record<string, string[]>;
  buildSummaryForSession: (sessionId: string) => UserContextSummary;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  requestChatSuggestions: (params: {
    text: string;
    recentMessages: ChatSession["messages"];
    contextPayload: Record<string, unknown>;
    runtimeContextText: string;
    excludeSuggestions: string[];
    count: number;
  }) => Promise<string[]>;
};

type FetchInteractiveActionsForSessionParams = {
  sessionId: string;
  sessions: ChatSession[];
  lastAssistantText: string;
  runtimeContextText: string;
  actionMemory: ActionMemoryMap;
  inChatAssessmentSessionId: string | null;
  buildActionContextText: (sessionId: string) => string;
  requestActionSuggestions: (params: {
    assistantText: string;
    recentMessages: ChatSession["messages"];
    contextSummaryText: string;
    runtimeContextText: string;
  }) => Promise<ChatAgentSuggestedAction[]>;
};

const CHAT_SUGGESTION_COUNT = 2;
const INTERACTIVE_ACTION_LIMIT = 4;
const SUGGESTION_HISTORY_WINDOW = 8;

export async function fetchSuggestionsForSession(
  params: FetchSuggestionsForSessionParams
): Promise<string[]> {
  const recentSuggestionHistory = getSuggestionHistory(
    params.suggestionHistoryStore,
    params.sessionId
  ).slice(-SUGGESTION_HISTORY_WINDOW);
  const summary = params.buildSummaryForSession(params.sessionId);
  const fallback = buildDataDrivenSuggestions(
    summary,
    CHAT_SUGGESTION_COUNT,
    recentSuggestionHistory
  );
  const recentMessages =
    params.sessions.find((session) => session.id === params.sessionId)?.messages ??
    [];

  let fromApi: string[] = [];
  try {
    fromApi = await params.requestChatSuggestions({
      text: params.lastAssistantText,
      contextPayload: params.buildContextPayload(params.sessionId),
      runtimeContextText: params.runtimeContextText,
      recentMessages,
      excludeSuggestions: recentSuggestionHistory,
      count: CHAT_SUGGESTION_COUNT,
    });
  } catch {
    fromApi = [];
  }

  const finalSuggestions = buildFinalSuggestions({
    fromApi,
    fallback,
    recentSuggestionHistory,
    safeCount: CHAT_SUGGESTION_COUNT,
  });
  rememberSuggestions(
    params.suggestionHistoryStore,
    params.sessionId,
    finalSuggestions
  );
  return finalSuggestions;
}

export async function fetchInteractiveActionsForSession(
  params: FetchInteractiveActionsForSessionParams
): Promise<ChatAgentSuggestedAction[]> {
  if (params.inChatAssessmentSessionId === params.sessionId) {
    return [];
  }

  const recentMessages =
    params.sessions.find((session) => session.id === params.sessionId)?.messages ??
    [];
  const contextSummaryText = params.buildActionContextText(params.sessionId);
  const fallbackRows = sortActionsByMemory(
    buildFallbackInteractiveActions(params.lastAssistantText),
    params.actionMemory
  );

  try {
    const mapped = await params.requestActionSuggestions({
      assistantText: params.lastAssistantText,
      recentMessages,
      contextSummaryText,
      runtimeContextText: params.runtimeContextText,
    });
    const prioritizedMapped = sortActionsByMemory(mapped, params.actionMemory);
    return (prioritizedMapped.length > 0 ? prioritizedMapped : fallbackRows).slice(
      0,
      INTERACTIVE_ACTION_LIMIT
    );
  } catch {
    return fallbackRows.slice(0, INTERACTIVE_ACTION_LIMIT);
  }
}

