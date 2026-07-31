import type { ChatMessage } from "@/types/chat";

/**
 * The subset of a session that is safe to replay to the model.
 *
 * A failed turn holds user-facing error copy, not something the assistant said.
 * Sending it back teaches the model that "답변을 받아오지 못했어요" is its own prior
 * answer, which derails the next reply. Empty placeholders are dropped for the
 * same reason.
 */
export function toModelTranscript(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (message) => message.status !== "error" && Boolean(message.content?.trim())
  );
}
