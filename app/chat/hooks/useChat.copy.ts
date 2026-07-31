export const CHAT_COPY = {
  offlineInit:
    "지금 네트워크 연결이 불안정해서 초기 상담 내용을 불러오지 못했어요. 연결이 복구되면 새로고침 없이 다시 이어서 도와드릴게요.",
  offlineChat:
    "지금 네트워크 연결이 불안정해서 답변을 불러오지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.",
  streamError: "답변을 받아오지 못했어요. 잠시 후 다시 시도해 주세요.",
  stoppedBeforeAnswer: "답변을 중단했어요.",
  inChatAssessmentCanceled: "대화형 검사를 중단했어요. 원하면 다시 시작해 주세요.",
} as const;

/**
 * Users get one fixed sentence regardless of the underlying failure. Transport
 * details ("HTTP 500", provider payloads) are noise inside a counseling
 * transcript and can carry internals, so they go to the console instead.
 */
export function toAssistantErrorText(error: unknown) {
  if (error) {
    console.error("[chat] assistant turn failed", error);
  }
  return CHAT_COPY.streamError;
}
