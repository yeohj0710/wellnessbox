import {
  NHIS_AI_MODEL,
  type OpenAiSummaryDraft,
} from "./fetch-ai-summary-model";
import {
  asRecord,
  type NhisAiSnapshot,
} from "./fetch-ai-summary-snapshot";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 9_000;

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function buildPrompt(snapshot: NhisAiSnapshot) {
  return JSON.stringify(
    {
      checkupCount: snapshot.checkupCount,
      medicationCount: snapshot.medicationCount,
      latestCheckupDate: snapshot.latestCheckupDate,
      checkupSamples: snapshot.checkupSamples,
      medicationSamples: snapshot.medicationSamples,
    },
    null,
    2
  );
}

export async function requestOpenAiSummary(
  snapshot: NhisAiSnapshot
): Promise<OpenAiSummaryDraft | null> {
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
        model: NHIS_AI_MODEL,
        temperature: 0.2,
        max_tokens: 480,
        response_format: { type: "json_object" as const },
        messages: [
          {
            role: "system",
            content:
              "당신은 건강검진/복약 데이터를 초보자도 이해할 수 있게 설명하는 도우미입니다. 의료 진단/처방처럼 단정하지 말고, 데이터에 없는 내용은 추측하지 마세요. 한국어 존댓말(요체)로만 작성하세요. 반드시 JSON 객체만 반환하세요. JSON 스키마: {\"headline\": string, \"summary\": string, \"highlights\": string[], \"nextSteps\": string[], \"metricInsights\": [{\"metric\": string, \"value\": string, \"interpretation\": string, \"tip\": string}], \"riskLevel\": \"low\"|\"medium\"|\"high\"|\"unknown\"}. headline은 24자 내외, summary는 2~3문장으로 쉬운 말로 작성하고, highlights/nextSteps는 각 1~3개, metricInsights는 2~4개를 작성하세요. interpretation은 '이 수치가 왜 중요한지'를 한 문장으로, tip은 '사용자가 바로 할 수 있는 행동' 한 문장으로 작성하세요.",
          },
          {
            role: "user",
            content: `다음 데이터를 요약해 주세요.\n${buildPrompt(snapshot)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json().catch(() => null);
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return null;
    }

    const parsed = JSON.parse(content);
    const parsedRecord = asRecord(parsed);
    if (!parsedRecord) return null;

    return {
      headline: parsedRecord.headline,
      summary: parsedRecord.summary,
      highlights: parsedRecord.highlights,
      nextSteps: parsedRecord.nextSteps,
      metricInsights: parsedRecord.metricInsights,
      riskLevel: parsedRecord.riskLevel,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.warn("[hyphen][ai-summary] failed to call OpenAI", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
