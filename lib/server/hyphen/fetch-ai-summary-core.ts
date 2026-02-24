import type { NhisFetchRoutePayload } from "./fetch-contract";
import {
  asRecord,
  buildNhisAiSnapshot,
  toTrimmedText,
  type NhisAiSnapshot,
} from "./fetch-ai-summary-snapshot";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const NHIS_AI_MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 9_000;

type NhisAiRiskLevel = "low" | "medium" | "high" | "unknown";

type NhisAiMetricInsight = {
  metric: string;
  value: string;
  interpretation: string;
  tip: string;
};

export type NhisAiSummary = {
  source: "openai" | "fallback";
  model: string;
  generatedAt: string;
  headline: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
  metricInsights: NhisAiMetricInsight[];
  riskLevel: NhisAiRiskLevel;
};

type OpenAiSummaryDraft = {
  headline?: unknown;
  summary?: unknown;
  highlights?: unknown;
  nextSteps?: unknown;
  metricInsights?: unknown;
  riskLevel?: unknown;
};

function sanitizeLine(value: unknown, maxLength: number): string | null {
  const text = toTrimmedText(value, maxLength);
  if (!text) return null;
  const sanitized = text.replace(/^[\-\*•\d.)\s]+/, "").trim();
  return sanitized.length > 0 ? sanitized : null;
}

function normalizeStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] {
  const source = Array.isArray(value) ? value : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    const line = sanitizeLine(item, maxLength);
    if (!line) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeMetricInsights(
  value: unknown,
  maxItems: number
): NhisAiMetricInsight[] {
  const source = Array.isArray(value) ? value : [];
  const out: NhisAiMetricInsight[] = [];
  const seen = new Set<string>();

  for (const item of source) {
    const record = asRecord(item);
    if (!record) continue;

    const metric = sanitizeLine(record.metric, 48);
    const metricValue = sanitizeLine(record.value, 48);
    const interpretation = sanitizeLine(record.interpretation, 110);
    const tip = sanitizeLine(record.tip, 96);

    if (!metric || !metricValue || !interpretation || !tip) continue;
    const signature = `${metric}|${metricValue}|${interpretation}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    out.push({
      metric,
      value: metricValue,
      interpretation,
      tip,
    });

    if (out.length >= maxItems) break;
  }

  return out;
}

function resolveMetricTip(metric: string) {
  const normalized = metric.toLowerCase();
  if (/(혈압|수축기|이완기|pressure|bp)/i.test(normalized)) {
    return "집에서 같은 시간대에 1주일 정도 다시 재서 추세를 확인해 보세요.";
  }
  if (/(혈당|당화|hba1c|a1c|glucose)/i.test(normalized)) {
    return "식사/간식 패턴을 기록하고 다음 검사 때 같은 항목을 비교해 보세요.";
  }
  if (/(체질량|bmi|체중|허리|복부)/i.test(normalized)) {
    return "무리한 감량보다 수면과 식사 시간을 일정하게 맞추는 것부터 시작해 보세요.";
  }
  if (/(콜레스테롤|hdl|ldl|중성지방|triglyceride)/i.test(normalized)) {
    return "기름진 야식 빈도를 줄이고 물 섭취를 늘린 뒤 다음 수치를 비교해 보세요.";
  }
  if (/(ast|alt|간|ggt|감마)/i.test(normalized)) {
    return "음주/야식 패턴을 점검하고 필요하면 의료진 상담으로 확인해 보세요.";
  }
  return "다음 검진에서 같은 항목이 어떻게 변하는지 추세로 확인해 보세요.";
}

function buildCheckupInsight(sample: NhisAiSnapshot["checkupSamples"][number]) {
  const metric = sample.metric;
  const value = sample.value;
  const reference = sample.reference;

  const bpMatch = value.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})$/);
  if (bpMatch && /(혈압|수축기|이완기|pressure|bp)/i.test(metric)) {
    const systolic = Number(bpMatch[1]);
    const diastolic = Number(bpMatch[2]);
    const interpretation =
      systolic >= 140 || diastolic >= 90
        ? "혈압이 높게 기록되어 생활습관 점검이 필요해 보입니다."
        : systolic < 90 || diastolic < 60
        ? "혈압이 낮게 기록되어 컨디션과 함께 다시 확인하는 편이 좋습니다."
        : "혈압 수치가 기준 범위에 가까운 편으로 보입니다.";
    return {
      metric,
      value,
      interpretation,
      tip: resolveMetricTip(metric),
    };
  }

  const interpretation = reference
    ? `참고 범위(${reference})와 비교해 변화 여부를 확인해 보세요.`
    : "수치 자체보다 이전 검사 대비 변화가 있는지 함께 보는 것이 중요합니다.";

  return {
    metric,
    value,
    interpretation,
    tip: resolveMetricTip(metric),
  };
}

function fallbackMetricInsights(snapshot: NhisAiSnapshot): NhisAiMetricInsight[] {
  if (snapshot.checkupSamples.length > 0) {
    return snapshot.checkupSamples.slice(0, 4).map((sample) =>
      buildCheckupInsight(sample)
    );
  }

  if (snapshot.medicationSamples.length > 0) {
    const sample = snapshot.medicationSamples[0];
    return [
      {
        metric: "최근 복약",
        value: sample.medicine,
        interpretation: sample.purpose
          ? `복용 목적은 ${sample.purpose} 관련으로 확인됩니다.`
          : "복약 기록이 있어 약품명 중심으로 먼저 안내해 드립니다.",
        tip:
          "복약이 바뀌었다면 최신 상태로 다시 조회해 현재 기록과 맞는지 확인해 보세요.",
      },
    ];
  }

  return [
    {
      metric: "요약 대기",
      value: "데이터 없음",
      interpretation: "아직 수치 데이터를 불러오지 못해 분석을 준비 중입니다.",
      tip: "다시 조회하면 핵심 수치 기반으로 더 자세한 해석을 제공해 드릴게요.",
    },
  ];
}

function fallbackHighlights(snapshot: NhisAiSnapshot) {
  const highlights: string[] = [];

  if (snapshot.checkupSamples.length > 0) {
    highlights.push(
      `${snapshot.checkupSamples[0].metric}: ${snapshot.checkupSamples[0].value}`
    );
  }
  if (snapshot.checkupSamples.length > 1) {
    highlights.push(
      `${snapshot.checkupSamples[1].metric}: ${snapshot.checkupSamples[1].value}`
    );
  }
  if (snapshot.medicationSamples.length > 0) {
    const item = snapshot.medicationSamples[0];
    highlights.push(
      item.date
        ? `최근 복약: ${item.medicine} (${item.date})`
        : `최근 복약: ${item.medicine}`
    );
  }
  if (highlights.length === 0) {
    highlights.push("아직 불러온 데이터가 충분하지 않아요.");
  }
  return highlights.slice(0, 3);
}

function fallbackNextSteps(snapshot: NhisAiSnapshot) {
  if (snapshot.checkupCount > 0) {
    return [
      "평소와 다른 수치는 의료진과 상담해 보세요.",
      "최근 복약 정보와 함께 비교하면 더 정확하게 확인할 수 있어요.",
    ];
  }
  if (snapshot.medicationCount > 0) {
    return [
      "복약 정보가 최신인지 한 번 더 확인해 주세요.",
      "검진 데이터도 연동하면 더 자세히 안내해 드릴 수 있어요.",
    ];
  }
  return ["다시 조회해 주시면 핵심 내용을 빠르게 정리해 드릴게요."];
}

function buildFallbackSummary(snapshot: NhisAiSnapshot): NhisAiSummary {
  const nowIso = new Date().toISOString();

  if (snapshot.checkupCount > 0) {
    return {
      source: "fallback",
      model: "rule-based",
      generatedAt: nowIso,
      headline:
        snapshot.medicationCount > 0
          ? "검진과 복약 결과를 함께 정리했어요."
          : "검진 결과를 핵심만 정리했어요.",
      summary: snapshot.latestCheckupDate
        ? `최근 검진일 ${snapshot.latestCheckupDate} 기준으로 핵심 항목을 먼저 보여드려요.`
        : `최근 검진 항목 ${snapshot.checkupCount.toLocaleString(
            "ko-KR"
          )}개를 바탕으로 핵심부터 확인하실 수 있어요.`,
      highlights: fallbackHighlights(snapshot),
      nextSteps: fallbackNextSteps(snapshot),
      metricInsights: fallbackMetricInsights(snapshot),
      riskLevel: "unknown",
    };
  }

  if (snapshot.medicationCount > 0) {
    return {
      source: "fallback",
      model: "rule-based",
      generatedAt: nowIso,
      headline: "최근 복약 이력을 먼저 정리했어요.",
      summary:
        "검진 데이터가 없어도 최근 복약 기록을 기준으로 핵심 내용부터 빠르게 확인하실 수 있어요.",
      highlights: fallbackHighlights(snapshot),
      nextSteps: fallbackNextSteps(snapshot),
      metricInsights: fallbackMetricInsights(snapshot),
      riskLevel: "unknown",
    };
  }

  return {
    source: "fallback",
    model: "rule-based",
    generatedAt: nowIso,
    headline: "아직 분석할 데이터가 없어요.",
    summary:
      "조회가 완료되면 검진 또는 복약 데이터를 바탕으로 AI 요약을 바로 보여드릴게요.",
    highlights: fallbackHighlights(snapshot),
    nextSteps: fallbackNextSteps(snapshot),
    metricInsights: fallbackMetricInsights(snapshot),
    riskLevel: "unknown",
  };
}

function normalizeRiskLevel(value: unknown): NhisAiRiskLevel {
  const lowered = toTrimmedText(value, 24)?.toLowerCase() ?? "";
  if (
    lowered === "low" ||
    lowered.includes("낮") ||
    lowered.includes("안정")
  ) {
    return "low";
  }
  if (
    lowered === "medium" ||
    lowered.includes("중간") ||
    lowered.includes("보통")
  ) {
    return "medium";
  }
  if (
    lowered === "high" ||
    lowered.includes("높") ||
    lowered.includes("주의")
  ) {
    return "high";
  }
  return "unknown";
}

function mergeAiSummary(
  draft: OpenAiSummaryDraft,
  fallback: NhisAiSummary
): NhisAiSummary {
  const headline = sanitizeLine(draft.headline, 48) ?? fallback.headline;
  const summary = sanitizeLine(draft.summary, 180) ?? fallback.summary;
  const highlights = normalizeStringArray(draft.highlights, 3, 72);
  const nextSteps = normalizeStringArray(draft.nextSteps, 3, 72);
  const metricInsights = normalizeMetricInsights(draft.metricInsights, 4);

  return {
    source: "openai",
    model: NHIS_AI_MODEL,
    generatedAt: new Date().toISOString(),
    headline,
    summary,
    highlights: highlights.length > 0 ? highlights : fallback.highlights,
    nextSteps: nextSteps.length > 0 ? nextSteps : fallback.nextSteps,
    metricInsights:
      metricInsights.length > 0 ? metricInsights : fallback.metricInsights,
    riskLevel: normalizeRiskLevel(draft.riskLevel),
  };
}

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

async function requestOpenAiSummary(
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

export async function enrichNhisPayloadWithAiSummary(
  payload: NhisFetchRoutePayload
): Promise<NhisFetchRoutePayload> {
  if (!payload.ok) return payload;

  const data = asRecord(payload.data);
  if (!data) return payload;

  const normalized = asRecord(data.normalized);
  if (!normalized) return payload;

  const snapshot = buildNhisAiSnapshot(normalized);
  const fallback = buildFallbackSummary(snapshot);
  const hasAnalyzableData =
    snapshot.checkupCount > 0 || snapshot.medicationCount > 0;
  if (!hasAnalyzableData) {
    normalized.aiSummary = fallback;
    return payload;
  }
  const aiDraft = await requestOpenAiSummary(snapshot);

  normalized.aiSummary = aiDraft
    ? mergeAiSummary(aiDraft, fallback)
    : fallback;

  return payload;
}
