import type { Dispatch, SetStateAction } from "react";
import type { ChatMessage } from "@/types/chat";
import type { InChatAssessmentMode, InChatAssessmentState } from "./useChat.assessment";
import type {
  NormalizedAssessResult,
  NormalizedCheckAiResult,
} from "./useChat.results";
import {
  handleInChatAssessmentInputFlow,
  initializeInChatAssessmentFlow,
} from "./useChat.assessmentFlow";
import type { FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";

type CreateInChatAssessmentHandlersInput = {
  state: InChatAssessmentState | null;
  setInChatAssessment: Dispatch<SetStateAction<InChatAssessmentState | null>>;
  clearFollowups: () => void;
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string
  ) => void;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  setLocalCheckAi: Dispatch<SetStateAction<string[]>>;
  setCheckAiResult: Dispatch<SetStateAction<NormalizedCheckAiResult | null>>;
  setLocalAssessCats: Dispatch<SetStateAction<string[]>>;
  setAssessResult: Dispatch<SetStateAction<NormalizedAssessResult | null>>;
  getTzOffsetMinutes: () => number;
};

type InChatAssessmentInputParams = {
  text: string;
  sessionId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
};

export function createInChatAssessmentHandlers({
  state,
  setInChatAssessment,
  clearFollowups,
  updateAssistantMessage,
  finalizeAssistantTurn,
  setLocalCheckAi,
  setCheckAiResult,
  setLocalAssessCats,
  setAssessResult,
  getTzOffsetMinutes,
}: CreateInChatAssessmentHandlersInput) {
  function initializeInChatAssessment(sessionId: string, mode: InChatAssessmentMode) {
    return initializeInChatAssessmentFlow({
      sessionId,
      mode,
      setInChatAssessment,
      clearSuggestionsAndActions: clearFollowups,
    });
  }

  async function tryHandleInChatAssessmentInput(params: InChatAssessmentInputParams) {
    return handleInChatAssessmentInputFlow({
      state,
      text: params.text,
      sessionId: params.sessionId,
      userMessage: params.userMessage,
      assistantMessage: params.assistantMessage,
      isFirst: params.isFirst,
      setInChatAssessment,
      clearSuggestionsAndActions: clearFollowups,
      updateAssistantMessage,
      finalizeAssistantTurn,
      setLocalCheckAi,
      setCheckAiResult,
      setLocalAssessCats,
      setAssessResult,
      getTzOffsetMinutes,
    });
  }

  return {
    initializeInChatAssessment,
    tryHandleInChatAssessmentInput,
  };
}
