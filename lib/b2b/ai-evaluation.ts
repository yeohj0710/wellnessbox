import "server-only";

import { getDefaultModel } from "@/lib/ai/models";
import type { B2bAiEvaluation } from "@/lib/b2b/analyzer";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 10_000;

type GenerateAiEvaluationInput = {
  periodKey: string;
  summary: {
    overallScore: number;
    surveyScore: number;
    healthScore: number;
    medicationScore: number;
    riskLevel: string;
  };
  topIssues: Array<{ title: string; score: number }>;
  riskFlags: string[];
  recommendations: string[];
  trend: Array<{
    periodKey: string;
    overallScore: number;
    surveyScore: number;
    healthScore: number;
  }>;
};

type OpenAiResponseDraft = {
  summary?: unknown;
  monthlyGuide?: unknown;
  actionItems?: unknown;
  caution?: unknown;
};

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function sanitizeLine(value: unknown, maxLength: number) {
  const text = toText(value);
  if (!text) return null;
  const sanitized = text.replace(/\s+/g, " ").trim();
  if (!sanitized) return null;
  return sanitized.length > maxLength
    ? `${sanitized.slice(0, maxLength - 1)}…`
    : sanitized;
}

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  const source = Array.isArray(value) ? value : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    const text = sanitizeLine(item, maxLength);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function buildFallback(input: GenerateAiEvaluationInput, model: string): B2bAiEvaluation {
  const topIssueText =
    input.topIssues.length > 0
      ? input.topIssues.map((item) => `${item.title}(${Math.round(item.score)}점)`).join(", ")
      : "주요 이슈 데이터가 아직 충분하지 않습니다.";

  const summary = `이번 달 종합 점수는 ${Math.round(
    input.summary.overallScore
  )}점입니다. 주요 이슈는 ${topIssueText}이며, 위험 신호 항목을 우선 점검해 주세요.`;

  const monthlyGuide =
    input.summary.riskLevel === "high"
      ? "이번 달은 무리한 목표보다 위험 지표 안정화에 집중하고, 복약/수면/식사 시간을 일정하게 유지해 주세요."
      : "이번 달은 현재 루틴을 유지하면서 저점 영역 1~2개를 집중 개선해 주세요.";

  const actionItems = [
    ...input.recommendations.slice(0, 2),
    "매주 같은 요일에 증상 메모를 남기고 다음 달 점수와 비교해 주세요.",
  ].slice(0, 3);

  const caution =
    input.riskFlags[0] ||
    "의료적 진단이 필요한 증상은 자가 판단하지 말고 전문가 상담을 권장합니다.";

  return {
    generatedAt: new Date().toISOString(),
    model,
    summary,
    monthlyGuide,
    actionItems,
    caution,
  };
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function buildPrompt(input: GenerateAiEvaluationInput) {
  return JSON.stringify(
    {
      periodKey: input.periodKey,
      scoreSummary: input.summary,
      topIssues: input.topIssues,
      riskFlags: input.riskFlags.slice(0, 5),
      recommendations: input.recommendations.slice(0, 6),
      trend: input.trend.slice(-6),
    },
    null,
    2
  );
}

async function requestOpenAiEvaluation(
  input: GenerateAiEvaluationInput,
  model: string
): Promise<OpenAiResponseDraft | null> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 420,
        response_format: { type: "json_object" as const },
        messages: [
          {
            role: "system",
            content:
              "당신은 기업 임직원 건강리포트 코치입니다. 한국어로 작성하세요. " +
              "의료 진단/치료처럼 단정하지 말고, 데이터 기반 일반 가이드만 제시하세요. " +
              '반드시 JSON 객체만 반환하세요. 스키마: {"summary": string, "monthlyGuide": string, "actionItems": string[], "caution": string}.',
          },
          {
            role: "user",
            content: `다음 건강 지표 요약으로 종합 평가를 작성해 주세요.\n${buildPrompt(input)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const body = await response.json().catch(() => null);
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) return null;
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return parsed as OpenAiResponseDraft;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateB2bAiEvaluation(input: GenerateAiEvaluationInput) {
  const model = await getDefaultModel();
  const fallback = buildFallback(input, model);
  const draft = await requestOpenAiEvaluation(input, model);
  if (!draft) return fallback;

  const summary = sanitizeLine(draft.summary, 240) || fallback.summary;
  const monthlyGuide = sanitizeLine(draft.monthlyGuide, 220) || fallback.monthlyGuide;
  const actionItems =
    normalizeStringArray(draft.actionItems, 4, 120).length > 0
      ? normalizeStringArray(draft.actionItems, 4, 120)
      : fallback.actionItems;
  const caution = sanitizeLine(draft.caution, 140) || fallback.caution;

  return {
    generatedAt: new Date().toISOString(),
    model,
    summary,
    monthlyGuide,
    actionItems,
    caution,
  } satisfies B2bAiEvaluation;
}
