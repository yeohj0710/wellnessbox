import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { ChatSession } from "@/types/chat";
import { getClientIdLocal, getTzOffsetMinutes } from "../utils";
import { saveChatOnce } from "./useChat.persistence";
import { startInitialAssistantMessageFlow } from "./useChat.initialAssistant";

type RunInitialAssistantMessageHandlerInput = {
  sessionId: string;
  sessions: ChatSession[];
  resultsLoaded: boolean;
  initStartedMap: Record<string, boolean>;
  isOnline: () => boolean;
  offlineMessage: string;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setAbortController: (controller: AbortController | null) => void;
  buildContextPayload: (sessionId: string) => Record<string, unknown>;
  buildRuntimeContextPayload: Parameters<
    typeof startInitialAssistantMessageFlow
  >[0]["buildRuntimeContextPayload"];
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string
  ) => void;
  fetchSuggestions: (lastAssistantText: string, sessionIdOverride?: string) => Promise<void>;
  fetchInteractiveActions: (
    lastAssistantText: string,
    sessionIdOverride?: string
  ) => Promise<void>;
  firstAssistantMessageRef: MutableRefObject<string>;
  savedKeysRef: MutableRefObject<Set<string>>;
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
};

export async function runInitialAssistantMessageHandler(
  input: RunInitialAssistantMessageHandlerInput
) {
  await startInitialAssistantMessageFlow({
    sessionId: input.sessionId,
    sessions: input.sessions,
    resultsLoaded: input.resultsLoaded,
    initStartedMap: input.initStartedMap,
    isOnline: input.isOnline,
    offlineMessage: input.offlineMessage,
    setSessions: input.setSessions,
    setLoading: input.setLoading,
    setAbortController: input.setAbortController,
    buildContextPayload: input.buildContextPayload,
    buildRuntimeContextPayload: input.buildRuntimeContextPayload,
    updateAssistantMessage: input.updateAssistantMessage,
    onComplete: async ({ fullText, assistantMessage }) => {
      input.fetchSuggestions(fullText, input.sessionId).catch(() => {});
      input.fetchInteractiveActions(fullText, input.sessionId).catch(() => {});
      input.firstAssistantMessageRef.current = fullText;

      try {
        const tzOffsetMinutes = getTzOffsetMinutes();
        const clientId = getClientIdLocal();
        await saveChatOnce({
          savedKeys: input.savedKeysRef.current,
          clientId,
          sessionId: input.sessionId,
          messages: [{ ...assistantMessage, content: fullText }],
          tzOffsetMinutes,
        });
        input.readyToPersistRef.current[input.sessionId] = true;
        input.setSessions((prev) => prev.slice());
      } catch {}
    },
  });
}
