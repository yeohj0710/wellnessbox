import type { ChatMessage } from "@/types/chat";
import { parseChatStreamPayload } from "@/lib/chat/stream-protocol";
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

export type StreamAssistantReplyResult = {
  text: string;
  failed: boolean;
};

export async function streamAssistantReply(
  input: StreamAssistantReplyInput
): Promise<StreamAssistantReplyResult> {
  const response = await requestChatStream({
    mode: input.mode,
    messages: input.messages,
    clientId: input.clientId,
    contextPayload: input.contextPayload,
    runtimeContext: input.runtimeContext,
    signal: input.signal,
  });

  const raw = await readStreamingText(response, input.onChunk);
  const { text, failed } = parseChatStreamPayload(raw);

  let fullText = sanitizeAssistantText(text, true);

  // Price hydration hits the catalog; a failed turn has nothing to hydrate.
  if (!failed) {
    try {
      fullText = await hydrateRecommendationPrices(fullText);
    } catch {}
  }

  return { text: sanitizeAssistantText(fullText, true), failed };
}
