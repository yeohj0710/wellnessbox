import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { dispatchChatCartActionRequest } from "@/lib/chat/cart-action-events";
import type {
  ChatActionType,
  ChatAgentExecuteDecision,
} from "@/lib/chat/agent-actions";
import type { ChatMessage, ChatSession } from "@/types/chat";
import { uid } from "../utils";
import type {
  InChatAssessmentMode,
  InChatAssessmentState,
} from "./useChat.assessment";
import {
  tryHandleAgentActionDecisionFlow,
  tryHandleCartCommandFlow,
} from "./useChat.actionFlow";
import { runAgentDecision as runAgentDecisionFlow } from "./useChat.agentDecision";
import {
  clearCartFromChat,
  navigateTo,
  openCartFromChat,
  openExternalLink,
} from "./useChat.browser";
import {
  formatCartCommandSummary,
  hasRoadAddressInLocalStorage,
  parseCartCommandFromMessages,
} from "./useChat.cart-command";
import type { FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";
import {
  nextInteractiveActionMark,
  shouldBlockInteractiveAction,
  type LastInteractiveAction,
} from "./useChat.interactionGuard";
import { runSingleInteractiveAction as runSingleInteractiveActionFlow } from "./useChat.interactiveActions";
import { appendMessagesToSession } from "./useChat.sessionState";

export type ActionBranchInput = {
  text: string;
  sessionId: string;
  sessionMessages: ChatMessage[];
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
};

type CreateInteractiveCommandsInput = {
  active: ChatSession | null;
  loading: boolean;
  actionLoading: boolean;
  runtimeContextText: string;
  buildActionContextText: (sessionId: string) => string;
  requestActionExecutionDecision: (input: {
    text: string;
    recentMessages: ChatMessage[];
    contextSummaryText: string;
    runtimeContextText: string;
  }) => Promise<ChatAgentExecuteDecision>;
  activeIdRef: MutableRefObject<string | null>;
  lastInteractiveActionRef: MutableRefObject<LastInteractiveAction>;
  setActionLoading: Dispatch<SetStateAction<boolean>>;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  setInChatAssessment: Dispatch<SetStateAction<InChatAssessmentState | null>>;
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  rememberExecutedActions: (actions: ChatActionType[]) => void;
  initializeInChatAssessment: (
    sessionId: string,
    mode: InChatAssessmentMode
  ) => string;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  updateAssistantMessage: (
    sessionId: string,
    messageId: string,
    content: string
  ) => void;
};

export function createInteractiveCommands(input: CreateInteractiveCommandsInput) {
  async function executeCartCommandText(params: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) {
    const parsed = await parseCartCommandFromMessages({
      text: params.commandText,
      messages: params.sessionMessages,
    });
    if (!parsed) {
      return {
        executed: false,
        summary: "",
        hasAddress: hasRoadAddressInLocalStorage(),
      };
    }

    dispatchChatCartActionRequest({
      source: "chat-command",
      openCartAfterSave: parsed.openCartAfterSave,
      items: parsed.items.map((entry) => ({
        productId: entry.recommendation.productId,
        productName: entry.recommendation.productName,
        optionType: entry.recommendation.optionType,
        quantity: entry.quantity,
      })),
    });

    return {
      executed: true,
      summary: formatCartCommandSummary(parsed.items),
      hasAddress: hasRoadAddressInLocalStorage(),
      openCartAfterSave: parsed.openCartAfterSave,
    };
  }

  async function runInteractiveAction(
    action: ChatActionType,
    sessionMessages: ChatMessage[]
  ) {
    return runSingleInteractiveActionFlow({
      action,
      sessionMessages,
      executeCartCommandText,
      openCart: openCartFromChat,
      clearCart: clearCartFromChat,
      openProfileSettings: () => input.setShowSettings(true),
      resetInChatAssessment: () => input.setInChatAssessment(null),
      startInChatAssessment: (mode) => {
        const sessionId = input.activeIdRef.current;
        if (!sessionId) return null;
        return input.initializeInChatAssessment(sessionId, mode);
      },
      navigateTo,
      openExternalLink,
    });
  }

  async function runAgentDecision(params: {
    decision: ChatAgentExecuteDecision;
    sessionMessages: ChatMessage[];
  }) {
    return runAgentDecisionFlow({
      decision: params.decision,
      sessionMessages: params.sessionMessages,
      executeCartCommandText,
      runSingleInteractiveAction: runInteractiveAction,
    });
  }

  async function tryHandleCartCommand(params: ActionBranchInput) {
    return tryHandleCartCommandFlow({
      ...params,
      executeCartCommandText,
      updateAssistantMessage: input.updateAssistantMessage,
      finalizeAssistantTurn: input.finalizeAssistantTurn,
    });
  }

  async function tryHandleAgentActionDecision(params: ActionBranchInput) {
    return tryHandleAgentActionDecisionFlow({
      ...params,
      runtimeContextText: input.runtimeContextText,
      buildActionContextText: input.buildActionContextText,
      requestActionExecutionDecision: input.requestActionExecutionDecision,
      runAgentDecision,
      rememberExecutedActions: input.rememberExecutedActions,
      updateAssistantMessage: input.updateAssistantMessage,
      finalizeAssistantTurn: input.finalizeAssistantTurn,
    });
  }

  async function handleInteractiveAction(actionType: ChatActionType) {
    const activeSession = input.active;
    if (!activeSession || input.loading || input.actionLoading) return;

    const now = Date.now();
    if (
      shouldBlockInteractiveAction({
        recent: input.lastInteractiveActionRef.current,
        nextType: actionType,
        now,
      })
    ) {
      return;
    }
    input.lastInteractiveActionRef.current = nextInteractiveActionMark(
      actionType,
      now
    );

    input.setActionLoading(true);
    try {
      const result = await runInteractiveAction(
        actionType,
        activeSession.messages || []
      );
      if (!result.executed) return;
      input.rememberExecutedActions([actionType]);

      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: result.summary
          ? `${result.message} ${result.summary}`.trim()
          : result.message,
        createdAt: now,
      };

      input.setSessions((prev) =>
        appendMessagesToSession(prev, activeSession.id, [assistantMessage])
      );

      await input.finalizeAssistantTurn({
        sessionId: activeSession.id,
        content: assistantMessage.content,
        assistantMessage,
      });
    } finally {
      input.setActionLoading(false);
    }
  }

  return {
    executeCartCommandText,
    runInteractiveAction,
    runAgentDecision,
    tryHandleCartCommand,
    tryHandleAgentActionDecision,
    handleInteractiveAction,
  };
}
