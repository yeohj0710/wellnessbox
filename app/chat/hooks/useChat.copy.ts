export const CHAT_COPY = {
  offlineInit:
    "지금 네트워크 연결이 불안정해서 초기 상담 내용을 불러오지 못했어요. 연결이 복구되면 새로고침 없이 다시 이어서 도와드릴게요.",
  offlineChat:
    "지금 네트워크 연결이 불안정해서 답변을 불러오지 못했어요. 연결이 안정되면 같은 질문을 다시 보내 주세요.",
  streamErrorFallback: "문제가 발생했어요.",
  inChatAssessmentCanceled: "대화형 검사를 중단했어요. 원하면 다시 시작해 주세요.",
} as const;

export function toAssistantErrorText(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const message = raw.trim().length > 0 ? raw : CHAT_COPY.streamErrorFallback;
  return `오류: ${message}`;
}
