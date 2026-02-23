import { evaluate as evaluateAssessAB } from "@/app/assess/logic/algorithm";
import { KEY_TO_CODE, labelOf } from "@/lib/categories";
import {
  persistCheckAiResult,
  requestCheckAiPredictScores,
} from "@/lib/checkai-client";
import { QUICK_CHAT_QUESTIONS } from "./useChat.assessment";

type EvaluateQuickOptions = {
  answers: Record<string, unknown>;
  setLocalCheckAi: (labels: string[]) => void;
  setCheckAiResult: (value: unknown) => void;
  getTzOffsetMinutes: () => number;
};

type EvaluateDeepOptions = {
  answers: Record<string, unknown>;
  setLocalAssessCats: (cats: string[]) => void;
  setAssessResult: (value: unknown) => void;
  getTzOffsetMinutes: () => number;
};

type EvaluationResult = {
  labels: string[];
  percents: number[];
};

export async function evaluateQuickCheckAnswers(
  options: EvaluateQuickOptions
): Promise<EvaluationResult> {
  const responses = QUICK_CHAT_QUESTIONS.map((question) => {
    const value = Number(options.answers[question.id]);
    if (!Number.isFinite(value) || value < 1 || value > 5) return 3;
    return Math.floor(value);
  });

  try {
    const scores = await requestCheckAiPredictScores(responses, "/api/predict");
    if (!scores.length) throw new Error("invalid quick check response");

    const labels = scores.map((score) => score.label);
    const percents = scores.map((score) => score.prob);

    options.setLocalCheckAi(labels);
    options.setCheckAiResult({
      labels,
      answers: responses.map((value, index) => ({
        question: QUICK_CHAT_QUESTIONS[index]?.text || "",
        answer: value,
      })),
    });

    await persistCheckAiResult({
      topLabels: labels,
      scores,
      answers: responses,
      tzOffsetMinutes: options.getTzOffsetMinutes(),
      saveUrl: "/api/check-ai/save",
    });

    return { labels, percents };
  } catch {
    const fallbackLabels = ["종합비타민", "오메가3", "프로바이오틱스(유산균)"];
    return { labels: fallbackLabels, percents: [0.82, 0.74, 0.67] };
  }
}

export async function evaluateDeepAssessAnswers(
  options: EvaluateDeepOptions
): Promise<EvaluationResult> {
  try {
    const evaluated = evaluateAssessAB(options.answers as any).top.slice(0, 3);
    const catsOrdered = evaluated.map((item) => KEY_TO_CODE[item.key] ?? item.key);
    const percents = evaluated.map((item) =>
      Math.max(0, Math.min(1, Number.isFinite(item.score) ? item.score : 0))
    );
    const labels = catsOrdered.map((code) => labelOf(code));

    try {
      const raw = localStorage.getItem("assess-state");
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.cResult = {
        catsOrdered,
        percents,
      };
      parsed.savedAt = Date.now();
      localStorage.setItem("assess-state", JSON.stringify(parsed));
    } catch {}

    options.setLocalAssessCats(catsOrdered);
    options.setAssessResult({
      summary: labels,
      answers: Object.entries(options.answers).map(([questionId, answer]) => ({
        question: questionId,
        answer: String(answer),
      })),
    });

    try {
      await fetch("/api/assess/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: options.answers,
          cResult: {
            catsOrdered,
            percents,
          },
          tzOffsetMinutes: options.getTzOffsetMinutes(),
        }),
      });
    } catch {}

    return { labels, percents };
  } catch {
    const fallbackLabels = ["종합비타민", "비타민D", "마그네슘"];
    return { labels: fallbackLabels, percents: [0.78, 0.71, 0.66] };
  }
}
