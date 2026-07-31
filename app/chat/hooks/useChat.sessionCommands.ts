import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatSession, UserProfile } from "@/types/chat";
import { saveProfileLocal, saveProfileServer, uid } from "../utils";
import type {
  InChatAssessmentMode,
  InChatAssessmentState,
} from "./useChat.assessment";
import { requestDeleteChatSession } from "./useChat.api";
import { navigateTo } from "./useChat.browser";
import { CHAT_COPY } from "./useChat.copy";
import {
  createNewChatSession,
  deleteChatSessionState,
} from "./useChat.sessionActions";
import {
  appendMessagesToSession,
  updateSessionTitle,
} from "./useChat.sessionState";

type CreateSessionCommandsInput = {
  sessions: ChatSession[];
  activeId: string | null;
  inChatAssessment: InChatAssessmentState | null;
  actorLoggedIn: boolean;
  actorAppUserId: string | null;
  abortRef: MutableRefObject<AbortController | null>;
  firstUserMessageRef: MutableRefObject<string>;
  firstAssistantMessageRef: MutableRefObject<string>;
  firstAssistantReplyRef: MutableRefObject<string>;
  readyToPersistRef: MutableRefObject<Record<string, boolean>>;
  suggestionHistoryRef: MutableRefObject<Record<string, string[]>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setProfile: Dispatch<SetStateAction<UserProfile | undefined>>;
  setInChatAssessment: Dispatch<SetStateAction<InChatAssessmentState | null>>;
  setTitleLoading: Dispatch<SetStateAction<boolean>>;
  setTitleError: Dispatch<SetStateAction<boolean>>;
  clearFollowups: () => void;
};

export function createSessionCommands(input: CreateSessionCommandsInput) {
  function newChat() {
    const created = createNewChatSession({
      sessions: input.sessions,
      actor: {
        loggedIn: input.actorLoggedIn,
        appUserId: input.actorAppUserId,
      },
    });

    input.setSessions(created.nextSessions);
    input.setActiveId(created.id);
    input.clearFollowups();
    input.setInChatAssessment(null);
    input.firstUserMessageRef.current = "";
    input.firstAssistantMessageRef.current = "";
    input.firstAssistantReplyRef.current = "";
    input.setTitleLoading(false);
    input.setTitleError(false);
    input.readyToPersistRef.current[created.id] = false;
    input.suggestionHistoryRef.current[created.id] = [];
  }

  async function deleteChat(id: string) {
    const prevSessions = input.sessions;
    const prevActiveId = input.activeId;
    const prevReady = { ...input.readyToPersistRef.current };

    const nextState = deleteChatSessionState({
      sessions: input.sessions,
      activeId: input.activeId,
      deleteId: id,
    });
    input.setSessions(nextState.nextSessions);
    input.setActiveId(nextState.nextActiveId);
    if (input.inChatAssessment?.sessionId === id) {
      input.setInChatAssessment(null);
    }

    delete input.readyToPersistRef.current[id];
    delete input.suggestionHistoryRef.current[id];

    try {
      await requestDeleteChatSession(id);
    } catch {
      input.readyToPersistRef.current = prevReady;
      input.setSessions(prevSessions);
      input.setActiveId(prevActiveId);
    }
  }

  function renameChat(id: string, title: string) {
    input.setSessions((prev) => updateSessionTitle(prev, id, title));
  }

  function stopStreaming() {
    input.abortRef.current?.abort();
  }

  function handleProfileChange(nextProfile?: UserProfile) {
    if (!nextProfile) {
      input.setProfile(undefined);
      saveProfileLocal(undefined as any);
      saveProfileServer(undefined as any);
      return;
    }

    if (
      typeof nextProfile === "object" &&
      Object.keys(nextProfile).length === 0
    ) {
      return;
    }

    input.setProfile(nextProfile);
    saveProfileLocal(nextProfile);
    saveProfileServer(nextProfile);
  }

  function cancelInChatAssessment() {
    if (!input.inChatAssessment) return;
    const sessionId = input.activeId;
    if (!sessionId || input.inChatAssessment.sessionId !== sessionId) {
      input.setInChatAssessment(null);
      return;
    }

    const assistantMessage = {
      id: uid(),
      role: "assistant" as const,
      content: CHAT_COPY.inChatAssessmentCanceled,
      createdAt: Date.now(),
    };
    input.setInChatAssessment(null);
    input.setSessions((prev) =>
      appendMessagesToSession(prev, sessionId, [assistantMessage])
    );
  }

  function openAssessmentPageFromChat(mode: InChatAssessmentMode) {
    input.setInChatAssessment(null);
    if (mode === "quick") {
      navigateTo("/check-ai");
      return;
    }
    navigateTo("/assess");
  }

  return {
    newChat,
    deleteChat,
    renameChat,
    stopStreaming,
    handleProfileChange,
    cancelInChatAssessment,
    openAssessmentPageFromChat,
  };
}
