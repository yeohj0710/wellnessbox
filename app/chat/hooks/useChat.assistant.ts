import type { ChatMessage } from "@/types/chat";
import { requestChatStream } from "./useChat.api";
import { hydrateRecommendationPrices } from "./useChat.recommendation";
import { readStreamingText } from "./useChat.stream";
import { sanitizeAssistantText } from "./useChat.text";

type RequestChatStreamInput = Parameters<typeof requestChatStream>[0];
type RuntimeContextPayload = RequestChatStreamInput["runtimeContext"];

type StreamAssistantReplyInput = {
  mode: "chat" | "init";
  messages: ChatMessage[];
  clientId: string;
  contextPayload: Record<string, unknown>;
  runtimeContext: RuntimeContextPayload;
  signal: AbortSignal;
  onChunk: (textSoFar: string) => void;
};

export async function streamAssistantReply(
  input: StreamAssistantReplyInput
): Promise<string> {
  const response = await requestChatStream({
    mode: input.mode,
    messages: input.messages,
    clientId: input.clientId,
    contextPayload: input.contextPayload,
    runtimeContext: input.runtimeContext,
    signal: input.signal,
  });

  let fullText = await readStreamingText(response, input.onChunk);

  const finalizedText = sanitizeAssistantText(fullText, true);
  if (finalizedText !== fullText) {
    fullText = finalizedText;
  }

  try {
    fullText = await hydrateRecommendationPrices(fullText);
  } catch {}

  return fullText;
}
