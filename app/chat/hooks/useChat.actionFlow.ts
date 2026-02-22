import type {
  ChatActionType,
  ChatAgentExecuteDecision,
} from "@/lib/chat/agent-actions";
import type { ChatMessage } from "@/types/chat";
import { isLikelyActionIntentText } from "./useChat.agentActions";

type CartCommandExecutionResult = {
  executed: boolean;
  summary: string;
  hasAddress: boolean;
  openCartAfterSave?: boolean;
};

type FinalizeTurnRequiredInput = {
  sessionId: string;
  content: string;
  assistantMessage: ChatMessage;
  userMessage: ChatMessage;
  isFirst: boolean;
};

type AgentDecisionExecutionResult = {
  executed: boolean;
  message: string;
  summary: string;
  executedActions: ChatActionType[];
};

function buildCartCommandReplyText(result: CartCommandExecutionResult) {
  return result.hasAddress
    ? result.openCartAfterSave
      ? `요청한 제품을 장바구니에 담고 바로 구매를 진행할 수 있게 열어둘게요. ${result.summary}`
      : `요청한 제품을 장바구니에 담았어요. ${result.summary}`
    : `요청한 제품을 담을 수 있도록 주소 입력 창을 열었어요. 주소를 입력하면 자동으로 담아둘게요. ${result.summary}`;
}

function isAgentDecisionNoop(decision: ChatAgentExecuteDecision) {
  return (
    !decision.handled &&
    decision.actions.length === 0 &&
    decision.cartIntent.mode === "none"
  );
}

function buildActionReplyText(result: AgentDecisionExecutionResult) {
  return result.summary
    ? `${result.message} ${result.summary}`.trim()
    : result.message;
}

export async function tryHandleCartCommandFlow(params: {
  text: string;
  sessionId: string;
  sessionMessages: ChatMessage[];
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
  executeCartCommandText: (input: {
    commandText: string;
    sessionMessages: ChatMessage[];
  }) => Promise<CartCommandExecutionResult>;
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  finalizeAssistantTurn: (input: FinalizeTurnRequiredInput) => Promise<void>;
}) {
  const result = await params.executeCartCommandText({
    commandText: params.text,
    sessionMessages: params.sessionMessages,
  });
  if (!result.executed) return false;

  const fullText = buildCartCommandReplyText(result);
  params.updateAssistantMessage(
    params.sessionId,
    params.assistantMessage.id,
    fullText
  );

  await params.finalizeAssistantTurn({
    sessionId: params.sessionId,
    content: fullText,
    assistantMessage: params.assistantMessage,
    userMessage: params.userMessage,
    isFirst: params.isFirst,
  });

  return true;
}

export async function tryHandleAgentActionDecisionFlow(params: {
  text: string;
  sessionId: string;
  sessionMessages: ChatMessage[];
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
  runtimeContextText: string;
  buildActionContextText: (sessionId: string) => string;
  requestActionExecutionDecision: (input: {
    text: string;
    recentMessages: ChatMessage[];
    contextSummaryText: string;
    runtimeContextText: string;
  }) => Promise<ChatAgentExecuteDecision>;
  runAgentDecision: (input: {
    decision: ChatAgentExecuteDecision;
    sessionMessages: ChatMessage[];
  }) => Promise<AgentDecisionExecutionResult>;
  rememberExecutedActions: (actions: ChatActionType[]) => void;
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  finalizeAssistantTurn: (input: FinalizeTurnRequiredInput) => Promise<void>;
}) {
  if (!isLikelyActionIntentText(params.text, params.sessionMessages)) {
    return false;
  }

  let decision: ChatAgentExecuteDecision = {
    handled: false,
    assistantReply: "",
    actions: [],
    cartIntent: { mode: "none" },
    confidence: 0,
  };

  try {
    decision = await params.requestActionExecutionDecision({
      text: params.text,
      recentMessages: params.sessionMessages.slice(-10),
      contextSummaryText: params.buildActionContextText(params.sessionId),
      runtimeContextText: params.runtimeContextText,
    });
  } catch {
    return false;
  }

  if (isAgentDecisionNoop(decision)) {
    return false;
  }

  const result = await params.runAgentDecision({
    decision,
    sessionMessages: params.sessionMessages,
  });
  if (!result.executed) return false;
  params.rememberExecutedActions(result.executedActions);

  const fullText = buildActionReplyText(result);
  params.updateAssistantMessage(
    params.sessionId,
    params.assistantMessage.id,
    fullText
  );

  await params.finalizeAssistantTurn({
    sessionId: params.sessionId,
    content: fullText,
    assistantMessage: params.assistantMessage,
    userMessage: params.userMessage,
    isFirst: params.isFirst,
  });

  return true;
}
