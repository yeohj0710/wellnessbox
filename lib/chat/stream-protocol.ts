/**
 * Wire protocol for the /api/chat text stream.
 *
 * Response headers are flushed before the model starts producing tokens, so a
 * failure that happens mid-stream can no longer be signalled with an HTTP
 * status. The server instead appends a marker to the very end of the body and
 * the client strips it, which lets a failed turn be rendered as a retryable
 * error instead of being mistaken for an answer.
 *
 * U+0017 delimits the marker. It is a control character, so it cannot appear in
 * model prose and cannot collide with anything a user typed. It is built from a
 * char code rather than written literally to keep this file plain ASCII.
 */
const MARKER_DELIMITER = String.fromCharCode(0x17);

export const CHAT_STREAM_FAILURE_MARKER = `${MARKER_DELIMITER}wb:chat-failed${MARKER_DELIMITER}`;

export const CHAT_STREAM_MESSAGES = {
  /** Upstream model or context pipeline threw. */
  failure: "답변을 만드는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  /** Stream completed without producing a single token. */
  empty: "답변이 비어 있어요. 같은 질문을 다시 보내주시면 이어서 도와드릴게요.",
} as const;

export type ChatStreamReadResult = {
  text: string;
  failed: boolean;
};

/**
 * Splits the trailing failure marker off a completed stream body.
 */
export function parseChatStreamPayload(raw: string): ChatStreamReadResult {
  if (!raw.endsWith(CHAT_STREAM_FAILURE_MARKER)) {
    return { text: raw, failed: false };
  }

  return {
    text: raw.slice(0, -CHAT_STREAM_FAILURE_MARKER.length),
    failed: true,
  };
}

/**
 * Hides the marker while tokens are still arriving. Cutting at the delimiter
 * also covers the case where the marker straddles two network chunks, so the
 * sentinel never flickers at the end of a streaming message.
 */
export function stripPartialFailureMarker(raw: string) {
  const delimiterIndex = raw.indexOf(MARKER_DELIMITER);
  return delimiterIndex >= 0 ? raw.slice(0, delimiterIndex) : raw;
}
