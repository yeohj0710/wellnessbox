import type { ChatMessage, ChatSession } from "@/types/chat";
import { uid } from "../utils";
import { normalizeNewlines } from "./useChat.text";

type PrepareOutgoingTurnInput = {
  loading: boolean;
  active: ChatSession | null;
  input: string;
  overrideText?: string;
  now?: number;
};

export type PreparedOutgoingTurn = {
  sessionId: string;
  sessionMessages: ChatMessage[];
  text: string;
  isFirst: boolean;
  now: number;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
};

export function prepareOutgoingTurn(
  input: PrepareOutgoingTurnInput
): PreparedOutgoingTurn | null {
  if (input.loading || !input.active) return null;

  const text = (input.overrideText ?? input.input).trim();
  if (!text) return null;

  const now = input.now ?? Date.now();
  const sessionMessages = input.active.messages || [];
  const isFirst = sessionMessages.length === 1;
  const userMessage: ChatMessage = {
    id: uid(),
    role: "user",
    content: normalizeNewlines(text),
    createdAt: now,
  };
  const assistantMessage: ChatMessage = {
    id: uid(),
    role: "assistant",
    content: "",
    createdAt: now,
  };

  return {
    sessionId: input.active.id,
    sessionMessages,
    text,
    isFirst,
    now,
    userMessage,
    assistantMessage,
  };
}
