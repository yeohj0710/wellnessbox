import type { ChatMessage } from "@/types/chat";
import type { AssistantTurnOutcome } from "./useChat.streamTurn";

export type FinalizeAssistantTurnInput = {
  sessionId: string;
  content: string;
  assistantMessage: ChatMessage;
  userMessage?: ChatMessage;
  isFirst?: boolean;
  outcome?: AssistantTurnOutcome;
};

type FinalizeAssistantTurnFlowInput = {
  turn: FinalizeAssistantTurnInput;
  onFirstTurn?: (content: string) => Promise<void> | void;
  fetchSuggestions: (lastAssistantText: string, sessionId: string) => Promise<void>;
  fetchInteractiveActions: (
    lastAssistantText: string,
    sessionId: string
  ) => Promise<void>;
  persistTurn: (turn: FinalizeAssistantTurnInput) => Promise<void>;
};

export async function finalizeAssistantTurnFlow(
  input: FinalizeAssistantTurnFlowInput
) {
  // The user just pressed stop; firing follow-up generation would spend the
  // request they cancelled and base it on a half-finished answer.
  const stopped = input.turn.outcome === "stopped";

  if (input.turn.isFirst && input.onFirstTurn && !stopped) {
    await input.onFirstTurn(input.turn.content);
  }

  if (!stopped) {
    await Promise.all([
      input.fetchSuggestions(input.turn.content, input.turn.sessionId),
      input.fetchInteractiveActions(input.turn.content, input.turn.sessionId),
    ]);
  }

  try {
    await input.persistTurn(input.turn);
  } catch {}
}

type GenerateTitleFlowInput = {
  activeId: string | null;
  firstUserMessage: string;
  firstAssistantMessage: string;
  firstAssistantReply: string;
  setTitleLoading: (loading: boolean) => void;
  setTitleError: (value: boolean) => void;
  requestTitle: (input: {
    firstUserMessage: string;
    firstAssistantMessage: string;
    assistantReply: string;
  }) => Promise<string>;
  applyTitle: (sessionId: string, title: string) => void;
  setTitleHighlightId: (id: string | null) => void;
  setTopTitleHighlight: (value: boolean) => void;
  clearHighlightDelayMs?: number;
};

export async function generateTitleFlow(input: GenerateTitleFlowInput) {
  if (
    !input.firstUserMessage ||
    !input.firstAssistantMessage ||
    !input.firstAssistantReply ||
    !input.activeId
  ) {
    return;
  }

  input.setTitleLoading(true);
  input.setTitleError(false);

  try {
    const title = await input.requestTitle({
      firstUserMessage: input.firstUserMessage,
      firstAssistantMessage: input.firstAssistantMessage,
      assistantReply: input.firstAssistantReply,
    });
    input.applyTitle(input.activeId, title);
    input.setTitleHighlightId(input.activeId);
    input.setTopTitleHighlight(true);
    setTimeout(() => {
      input.setTitleHighlightId(null);
      input.setTopTitleHighlight(false);
    }, input.clearHighlightDelayMs ?? 1500);
  } catch {
    input.setTitleError(true);
  } finally {
    input.setTitleLoading(false);
  }
}
