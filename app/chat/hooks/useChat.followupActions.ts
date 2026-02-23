import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ChatSession } from "@/types/chat";
import type { ChatAgentSuggestedAction } from "@/lib/chat/agent-actions";
import type { UserContextSummary } from "@/lib/chat/context";
import type { ActionMemoryMap } from "./useChat.actionMemory";
import {
  requestActionSuggestions,
  requestChatSuggestions,
} from "./useChat.api";
import {
  fetchInteractiveActionsForSession,
  fetchSuggestionsForSession,
} from "./useChat.followups";

type UseChatFollowupActionsInput = {
  active: ChatSession | null;
  sessions: ChatSession[];
  runtimeContextText: string;
  suggestionHistoryRef: MutableRefObject<Record<string, string[]>>;
  buildSummaryForSession: (sessionId: string) => UserContextSummary;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  setSuggestions: Dispatch<SetStateAction<string[]>>;
  actionMemory: ActionMemoryMap;
  inChatAssessmentSessionId: string | null;
  buildActionContextText: (sessionId: string) => string;
  activeIdRef: MutableRefObject<string | null>;
  setInteractiveActions: Dispatch<SetStateAction<ChatAgentSuggestedAction[]>>;
};

export function useChatFollowupActions({
  active,
  sessions,
  runtimeContextText,
  suggestionHistoryRef,
  buildSummaryForSession,
  buildContextPayload,
  setSuggestions,
  actionMemory,
  inChatAssessmentSessionId,
  buildActionContextText,
  activeIdRef,
  setInteractiveActions,
}: UseChatFollowupActionsInput) {
  const fetchSuggestions = useCallback(
    async (lastAssistantText: string, sessionIdOverride?: string) => {
      const targetSessionId = sessionIdOverride ?? active?.id ?? null;
      if (!targetSessionId) {
        setSuggestions([]);
        return;
      }
      const finalSuggestions = await fetchSuggestionsForSession({
        sessionId: targetSessionId,
        sessions,
        lastAssistantText,
        runtimeContextText,
        suggestionHistoryStore: suggestionHistoryRef.current,
        buildSummaryForSession: (sessionId) => buildSummaryForSession(sessionId),
        buildContextPayload: (sessionId) => buildContextPayload(sessionId),
        requestChatSuggestions,
      });
      setSuggestions(finalSuggestions);
    },
    [
      active,
      sessions,
      runtimeContextText,
      suggestionHistoryRef,
      buildSummaryForSession,
      buildContextPayload,
      setSuggestions,
    ]
  );

  const fetchInteractiveActions = useCallback(
    async (lastAssistantText: string, sessionIdOverride?: string) => {
      const targetSessionId = sessionIdOverride ?? active?.id ?? null;
      if (!targetSessionId) {
        setInteractiveActions([]);
        return;
      }
      const resolvedActions = await fetchInteractiveActionsForSession({
        sessionId: targetSessionId,
        sessions,
        lastAssistantText,
        runtimeContextText,
        actionMemory,
        inChatAssessmentSessionId,
        buildActionContextText: (sessionId) => buildActionContextText(sessionId),
        requestActionSuggestions,
      });

      if ((activeIdRef.current || "") !== targetSessionId) return;
      setInteractiveActions(resolvedActions);
    },
    [
      active,
      sessions,
      runtimeContextText,
      actionMemory,
      inChatAssessmentSessionId,
      buildActionContextText,
      activeIdRef,
      setInteractiveActions,
    ]
  );

  return {
    fetchSuggestions,
    fetchInteractiveActions,
  };
}
