import type { ChatMessage } from "@/types/chat";
import { evaluateDeepAssessAnswers, evaluateQuickCheckAnswers } from "./useChat.evaluation";
import {
  createAssessmentResultSummary,
  findNextAssessmentIndex,
  formatAssessmentQuestionPrompt,
  isAssessmentCancelIntent,
  isAssessmentEscapeIntent,
  parseChoiceAnswer,
  parseNumberAnswer,
  DEEP_CHAT_QUESTIONS,
  QUICK_CHAT_QUESTIONS,
  type InChatAssessmentMode,
  type InChatAssessmentState,
} from "./useChat.assessment";
import type { FinalizeAssistantTurnInput } from "./useChat.finalizeFlow";

type SetAssessmentState = (state: InChatAssessmentState | null) => void;

type InitializeInChatAssessmentFlowInput = {
  sessionId: string;
  mode: InChatAssessmentMode;
  setInChatAssessment: SetAssessmentState;
  clearSuggestionsAndActions: () => void;
};

export function initializeInChatAssessmentFlow(
  input: InitializeInChatAssessmentFlowInput
): string {
  const questions = (
    input.mode === "quick" ? QUICK_CHAT_QUESTIONS : DEEP_CHAT_QUESTIONS
  ).slice();
  const initialState: InChatAssessmentState = {
    sessionId: input.sessionId,
    mode: input.mode,
    questions,
    currentIndex: 0,
    answers: {},
  };
  input.setInChatAssessment(initialState);
  input.clearSuggestionsAndActions();

  return [
    input.mode === "quick"
      ? "좋아요. 페이지 이동 없이 대화형 빠른검사를 시작할게요."
      : "좋아요. 페이지 이동 없이 대화형 정밀검사를 시작할게요.",
    formatAssessmentQuestionPrompt({
      mode: input.mode,
      index: 0,
      total: questions.length,
      question: questions[0],
    }),
  ].join("\n\n");
}

type HandleInChatAssessmentInputFlowInput = {
  state: InChatAssessmentState | null;
  text: string;
  sessionId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  isFirst: boolean;
  setInChatAssessment: SetAssessmentState;
  clearSuggestionsAndActions: () => void;
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  finalizeAssistantTurn: (input: FinalizeAssistantTurnInput) => Promise<void>;
  setLocalCheckAi: (labels: string[]) => void;
  setCheckAiResult: (value: unknown) => void;
  setLocalAssessCats: (cats: string[]) => void;
  setAssessResult: (value: unknown) => void;
  getTzOffsetMinutes: () => number;
};

export async function handleInChatAssessmentInputFlow(
  input: HandleInChatAssessmentInputFlowInput
) {
  const state = input.state;
  if (!state || state.sessionId !== input.sessionId) return false;

  if (isAssessmentEscapeIntent(input.text)) {
    input.setInChatAssessment(null);
    return false;
  }

  if (isAssessmentCancelIntent(input.text)) {
    input.setInChatAssessment(null);
    input.clearSuggestionsAndActions();
    const cancelText = "대화형 검사를 중단했어요. 원하면 다시 시작해 주세요.";
    input.updateAssistantMessage(
      input.sessionId,
      input.assistantMessage.id,
      cancelText
    );
    return true;
  }

  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion) {
    input.setInChatAssessment(null);
    return false;
  }

  const parsed =
    currentQuestion.kind === "number"
      ? parseNumberAnswer(input.text, currentQuestion)
      : parseChoiceAnswer(input.text, currentQuestion);

  if (!parsed) {
    const guide =
      currentQuestion.kind === "number"
        ? `숫자로 답변해 주세요.${typeof currentQuestion.min === "number" && typeof currentQuestion.max === "number" ? ` (${currentQuestion.min}~${currentQuestion.max})` : ""}`
        : "아래 선택지 버튼을 누르거나 번호(예: 1번)로 답변해 주세요.";
    const retryText = `${guide}\n\n${formatAssessmentQuestionPrompt({
      mode: state.mode,
      index: state.currentIndex,
      total: state.questions.length,
      question: currentQuestion,
    })}`;
    input.updateAssistantMessage(
      input.sessionId,
      input.assistantMessage.id,
      retryText
    );
    return true;
  }

  const nextAnswers = {
    ...state.answers,
    [currentQuestion.id]: parsed.parsed,
  };
  const nextIndex = findNextAssessmentIndex(
    state.questions,
    nextAnswers,
    state.currentIndex + 1
  );

  if (nextIndex >= 0) {
    const nextState: InChatAssessmentState = {
      ...state,
      answers: nextAnswers,
      currentIndex: nextIndex,
    };
    input.setInChatAssessment(nextState);
    const nextQuestion = nextState.questions[nextState.currentIndex];
    const nextText = [
      `${currentQuestion.id} 응답: ${parsed.label}`,
      "",
      formatAssessmentQuestionPrompt({
        mode: nextState.mode,
        index: nextState.currentIndex,
        total: nextState.questions.length,
        question: nextQuestion,
      }),
    ].join("\n");
    input.updateAssistantMessage(input.sessionId, input.assistantMessage.id, nextText);
    return true;
  }

  input.setInChatAssessment(null);
  input.clearSuggestionsAndActions();

  const result =
    state.mode === "quick"
      ? await evaluateQuickCheckAnswers({
          answers: nextAnswers,
          setLocalCheckAi: input.setLocalCheckAi,
          setCheckAiResult: input.setCheckAiResult,
          getTzOffsetMinutes: input.getTzOffsetMinutes,
        })
      : await evaluateDeepAssessAnswers({
          answers: nextAnswers,
          setLocalAssessCats: input.setLocalAssessCats,
          setAssessResult: input.setAssessResult,
          getTzOffsetMinutes: input.getTzOffsetMinutes,
        });

  const doneText = [
    `${currentQuestion.id} 응답: ${parsed.label}`,
    "",
    createAssessmentResultSummary({
      mode: state.mode,
      labels: result.labels,
      percents: result.percents,
    }),
    "",
    state.mode === "quick"
      ? "원하면 지금 정밀검사(대화형)도 이어서 진행할 수 있어요."
      : "원하면 추천 카테고리 기준으로 제품 탐색도 바로 도와드릴게요.",
  ].join("\n");

  input.updateAssistantMessage(input.sessionId, input.assistantMessage.id, doneText);

  await input.finalizeAssistantTurn({
    sessionId: input.sessionId,
    content: doneText,
    assistantMessage: input.assistantMessage,
    userMessage: input.userMessage,
    isFirst: input.isFirst,
  });

  return true;
}
