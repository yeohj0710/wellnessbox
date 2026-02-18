import { sectionA, sectionB, type Question } from "@/app/assess/data/questions";
import { CHECK_AI_OPTIONS, CHECK_AI_QUESTIONS } from "@/lib/checkai";

export type InChatAssessmentMode = "quick" | "deep";

type ChatAssessmentOption = {
  label: string;
  value: unknown;
};

export type ChatAssessmentQuestion = {
  id: string;
  text: string;
  kind: "choice" | "number";
  options?: ChatAssessmentOption[];
  min?: number;
  max?: number;
  visibleWhen?: {
    id: string;
    equals: unknown;
  };
};

export type InChatAssessmentState = {
  sessionId: string;
  mode: InChatAssessmentMode;
  questions: ChatAssessmentQuestion[];
  currentIndex: number;
  answers: Record<string, unknown>;
};

export type InChatAssessmentPrompt = {
  mode: InChatAssessmentMode;
  title: string;
  progressText: string;
  questionText: string;
  expectsNumber: boolean;
  options: string[];
  min?: number;
  max?: number;
};

const ASSESSMENT_CANCEL_REGEX =
  /(검사\s*중단|중단해|취소해|그만|종료해|나갈래)/i;
const YES_INPUT_REGEX = /^(네|예|응|ㅇㅇ|맞아|맞아요|yes|y)$/i;
const NO_INPUT_REGEX = /^(아니|아니요|ㄴㄴ|no|n)$/i;

export const QUICK_CHAT_QUESTIONS: ChatAssessmentQuestion[] = CHECK_AI_QUESTIONS.map(
  (text, index) => ({
    id: `Q${index + 1}`,
    text,
    kind: "choice",
    options: CHECK_AI_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  })
);

export const DEEP_CHAT_QUESTIONS: ChatAssessmentQuestion[] = [...sectionA, ...sectionB]
  .filter((question) => question.type === "choice" || question.type === "number")
  .map((question: Question) => ({
    id: question.id,
    text: question.text,
    kind: question.type === "number" ? "number" : "choice",
    options:
      question.type === "choice"
        ? (question.options || []).map((option) => ({
            label: option.label,
            value: option.value,
          }))
        : undefined,
    min: question.min,
    max: question.max,
    visibleWhen:
      question.id === "A5" || question.id === "B22"
        ? { id: "A1", equals: "F" }
        : undefined,
  }));

export function isAssessmentCancelIntent(text: string) {
  return ASSESSMENT_CANCEL_REGEX.test(text);
}

export function isAssessmentEscapeIntent(text: string) {
  return (
    /(페이지|이동|열어|오픈|장바구니|카트|주문|구매|결제|프로필|내\s*주문|내\s*정보|내\s*데이터|문의|약관|개인정보|환불|이메일|전화|홈|탐색|빠른\s*검사|정밀\s*검사|약국|라이더|관리자)/i.test(
      text
    ) && !/^\s*\d+\s*$/.test(text)
  );
}

function normalizeAssessmentToken(text: string) {
  return (text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function isQuestionVisible(
  question: ChatAssessmentQuestion,
  answers: Record<string, unknown>
) {
  if (!question.visibleWhen) return true;
  return answers[question.visibleWhen.id] === question.visibleWhen.equals;
}

export function findNextAssessmentIndex(
  questions: ChatAssessmentQuestion[],
  answers: Record<string, unknown>,
  fromIndex: number
) {
  for (let index = fromIndex; index < questions.length; index += 1) {
    if (isQuestionVisible(questions[index], answers)) return index;
  }
  return -1;
}

export function parseChoiceAnswer(
  inputText: string,
  question: ChatAssessmentQuestion
): { parsed: unknown; label: string } | null {
  const options = Array.isArray(question.options) ? question.options : [];
  if (!options.length) return null;

  const numericPick = inputText.match(/^\s*(\d{1,2})\s*(번)?\s*$/);
  if (numericPick) {
    const idx = Number.parseInt(numericPick[1], 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return { parsed: options[idx].value, label: options[idx].label };
    }
  }

  const normalizedInput = normalizeAssessmentToken(inputText);
  if (!normalizedInput) return null;

  const boolValues = new Set(options.map((option) => typeof option.value));
  if (boolValues.has("boolean")) {
    if (YES_INPUT_REGEX.test(inputText)) {
      const match = options.find((option) => option.value === true);
      if (match) return { parsed: true, label: match.label };
    }
    if (NO_INPUT_REGEX.test(inputText)) {
      const match = options.find((option) => option.value === false);
      if (match) return { parsed: false, label: match.label };
    }
  }

  let best: { parsed: unknown; label: string; score: number } | null = null;
  for (const option of options) {
    const normalizedLabel = normalizeAssessmentToken(option.label);
    const normalizedValue =
      typeof option.value === "string"
        ? normalizeAssessmentToken(option.value)
        : String(option.value ?? "").toLowerCase();

    let score = -1;
    if (normalizedInput === normalizedLabel || normalizedInput === normalizedValue) {
      score = 10_000;
    } else if (
      normalizedLabel.length >= 2 &&
      (normalizedLabel.includes(normalizedInput) ||
        normalizedInput.includes(normalizedLabel))
    ) {
      score = 6_000 - Math.abs(normalizedLabel.length - normalizedInput.length);
    } else if (
      normalizedValue.length >= 2 &&
      (normalizedValue.includes(normalizedInput) ||
        normalizedInput.includes(normalizedValue))
    ) {
      score = 5_000 - Math.abs(normalizedValue.length - normalizedInput.length);
    }

    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { parsed: option.value, label: option.label, score };
    }
  }

  if (!best) return null;
  return { parsed: best.parsed, label: best.label };
}

export function parseNumberAnswer(
  inputText: string,
  question: ChatAssessmentQuestion
): { parsed: number; label: string } | null {
  const matched = inputText.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return null;
  const parsed = Number.parseFloat(matched[0]);
  if (!Number.isFinite(parsed)) return null;

  const min = typeof question.min === "number" ? question.min : -Infinity;
  const max = typeof question.max === "number" ? question.max : Infinity;
  if (parsed < min || parsed > max) return null;

  return { parsed, label: `${parsed}` };
}

export function formatAssessmentQuestionPrompt(params: {
  mode: InChatAssessmentMode;
  index: number;
  total: number;
  question: ChatAssessmentQuestion;
}) {
  const modeLabel =
    params.mode === "quick" ? "빠른검사(대화형)" : "정밀검사(대화형)";
  const header = `${modeLabel} ${params.index + 1}/${params.total}`;
  if (params.question.kind === "number") {
    const rangeText =
      typeof params.question.min === "number" &&
      typeof params.question.max === "number"
        ? ` (${params.question.min}~${params.question.max})`
        : "";
    return `${header}\n${params.question.text}\n숫자로 답변해 주세요${rangeText}.`;
  }
  const options = (params.question.options || [])
    .map((option, idx) => `${idx + 1}) ${option.label}`)
    .join("\n");
  return `${header}\n${params.question.text}\n${options}`;
}

export function createAssessmentResultSummary(params: {
  mode: InChatAssessmentMode;
  labels: string[];
  percents: number[];
}) {
  const modeLabel = params.mode === "quick" ? "빠른검사 결과" : "정밀검사 결과";
  const lines = params.labels
    .slice(0, 3)
    .map(
      (label, index) =>
        `- ${label}: ${(Math.max(0, params.percents[index] || 0) * 100).toFixed(1)}%`
    );
  return [`${modeLabel}를 정리했어요.`, ...lines].join("\n");
}

export function buildInChatAssessmentPrompt(params: {
  state: InChatAssessmentState | null;
  activeSessionId: string | null;
}): InChatAssessmentPrompt | null {
  const { state, activeSessionId } = params;
  if (!state) return null;
  if (!activeSessionId || state.sessionId !== activeSessionId) return null;
  const question = state.questions[state.currentIndex];
  if (!question) return null;

  return {
    mode: state.mode,
    title: state.mode === "quick" ? "대화형 빠른검사 진행 중" : "대화형 정밀검사 진행 중",
    progressText: `${state.currentIndex + 1}/${state.questions.length}`,
    questionText: question.text,
    expectsNumber: question.kind === "number",
    options:
      question.kind === "choice"
        ? (question.options || []).map((option) => option.label)
        : [],
    min: question.min,
    max: question.max,
  };
}
