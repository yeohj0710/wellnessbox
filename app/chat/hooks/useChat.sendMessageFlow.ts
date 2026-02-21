import type { ChatMessage } from "@/types/chat";

export type SendMessageBranchInput = {
  text: string;
  sessionId: string;
  sessionMessages: ChatMessage[];
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
};

type SendMessageBranchHandlers = {
  tryHandleInChatAssessmentInput: (input: SendMessageBranchInput) => Promise<boolean>;
  isBrowserOnline: () => boolean;
  handleOffline: (input: Pick<SendMessageBranchInput, "sessionId" | "assistantMessage">) => void;
  tryHandleAgentActionDecision: (input: SendMessageBranchInput) => Promise<boolean>;
  tryHandleCartCommand: (input: SendMessageBranchInput) => Promise<boolean>;
};

export type SendMessageBranchResult = "handled" | "offline" | "stream";

export async function resolveSendMessageBranch(
  input: SendMessageBranchInput,
  handlers: SendMessageBranchHandlers
): Promise<SendMessageBranchResult> {
  const handledByAssessment = await handlers.tryHandleInChatAssessmentInput(input);
  if (handledByAssessment) return "handled";

  if (!handlers.isBrowserOnline()) {
    handlers.handleOffline({
      sessionId: input.sessionId,
      assistantMessage: input.assistantMessage,
    });
    return "offline";
  }

  const handledByAction = await handlers.tryHandleAgentActionDecision(input);
  if (handledByAction) return "handled";

  const handledByCartCommand = await handlers.tryHandleCartCommand(input);
  if (handledByCartCommand) return "handled";

  return "stream";
}
