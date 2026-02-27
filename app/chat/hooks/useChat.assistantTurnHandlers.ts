import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatSession } from "@/types/chat";
import { getClientIdLocal, getTzOffsetMinutes } from "../utils";
import { requestChatTitle } from "./useChat.api";
import {
  finalizeAssistantTurnFlow,
  generateTitleFlow,
  type FinalizeAssistantTurnInput,
} from "./useChat.finalizeFlow";
import { saveChatOnce } from "./useChat.persistence";
import { DEFAULT_CHAT_TITLE } from "./useChat.session";
import { updateSessionTitle } from "./useChat.sessionState";

type CreateAssistantTurnHandlersInput = {
  activeId: string | null;
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  fetchSuggestions: (lastAssistantText: string, sessionId: string) => Promise<void>;
  fetchInteractiveActions: (
    lastAssistantText: string,
    sessionId: string
  ) => Promise<void>;
  savedKeysRef: MutableRefObject<Set<string>>;
  firstUserMessageRef: MutableRefObject<string>;
  firstAssistantMessageRef: MutableRefObject<string>;
  firstAssistantReplyRef: MutableRefObject<string>;
  setTitleLoading: (loading: boolean) => void;
  setTitleError: (value: boolean) => void;
  setTitleHighlightId: (id: string | null) => void;
  setTopTitleHighlight: (value: boolean) => void;
};

export function createAssistantTurnHandlers({
  activeId,
  sessions,
  setSessions,
  fetchSuggestions,
  fetchInteractiveActions,
  savedKeysRef,
  firstUserMessageRef,
  firstAssistantMessageRef,
  firstAssistantReplyRef,
  setTitleLoading,
  setTitleError,
  setTitleHighlightId,
  setTopTitleHighlight,
}: CreateAssistantTurnHandlersInput) {
  const generateTitle = async () => {
    await generateTitleFlow({
      activeId,
      firstUserMessage: firstUserMessageRef.current,
      firstAssistantMessage: firstAssistantMessageRef.current,
      firstAssistantReply: firstAssistantReplyRef.current,
      setTitleLoading,
      setTitleError,
      requestTitle: requestChatTitle,
      applyTitle: (sessionId, title) => {
        setSessions((prev) => updateSessionTitle(prev, sessionId, title));
      },
      setTitleHighlightId,
      setTopTitleHighlight,
    });
  };

  const finalizeAssistantTurn = async (input: FinalizeAssistantTurnInput) => {
    await finalizeAssistantTurnFlow({
      turn: input,
      onFirstTurn: async (content) => {
        firstAssistantReplyRef.current = content;
        await generateTitle();
      },
      fetchSuggestions,
      fetchInteractiveActions,
      persistTurn: async (turn) => {
        const clientId = getClientIdLocal();
        const tzOffsetMinutes = getTzOffsetMinutes();
        const persistedMessages = turn.userMessage
          ? [turn.userMessage, { ...turn.assistantMessage, content: turn.content }]
          : [{ ...turn.assistantMessage, content: turn.content }];

        await saveChatOnce({
          savedKeys: savedKeysRef.current,
          clientId,
          sessionId: turn.sessionId,
          title:
            sessions.find((session) => session.id === turn.sessionId)?.title ||
            DEFAULT_CHAT_TITLE,
          messages: persistedMessages,
          tzOffsetMinutes,
        });
      },
    });
  };

  return {
    finalizeAssistantTurn,
    generateTitle,
  };
}
