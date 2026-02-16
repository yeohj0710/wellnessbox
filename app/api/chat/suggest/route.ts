import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";
import { CATEGORY_LABELS } from "@/lib/categories";
import {
  buildDataDrivenSuggestions,
  buildUserContextSummary,
  toPlainText,
} from "@/lib/chat/context";
import {
  buildSuggestionMessages,
  buildSuggestionTopicClassifierMessages,
} from "@/lib/chat/prompts";

export const runtime = "nodejs";

const KNOWN_TOPICS: string[] = Object.values(CATEGORY_LABELS);

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

function trimText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeSuggestionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

function normalizeForSearch(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s\-_/·.,*~`'"()[\]]+/g, "")
    .replace(/ⓒ/g, "c");
}

function extractTopicFromKnown(text: string): string | null {
  const normalizedText = normalizeForSearch(text);
  let best: { label: string; position: number } | null = null;

  for (const label of KNOWN_TOPICS) {
    const base = label.replace(/\s*\(.*?\)\s*/g, "").trim();
    const candidates = [label, base].filter(Boolean);

    for (const candidate of candidates) {
      const position = normalizedText.indexOf(normalizeForSearch(candidate));
      if (position < 0) continue;
      if (!best || position < best.position) {
        best = { label, position };
      }
    }
  }

  return best?.label || null;
}

function buildTopicSourceText(
  text: string,
  recentMessages: Array<{ role?: string; content?: unknown }> | undefined,
  contextSummaryText: string
) {
  const history = Array.isArray(recentMessages)
    ? recentMessages
        .slice(-6)
        .map((message) => {
          const role = message?.role === "user" ? "사용자" : "AI";
          const content = trimText(toPlainText(message?.content), 220);
          return content ? `${role}: ${content}` : "";
        })
        .filter(Boolean)
        .join("\n")
    : "";

  return [text, contextSummaryText, history].filter(Boolean).join("\n\n");
}

function isAssistantDirected(text: string) {
  const noGo =
    /(어떤|어떻게|무엇을).*(하시나요|하고 계신가요)|있으신가요|하셨나요|느끼시나요|드시나요|드세요\?|하시겠어요\?|계신가요|말씀해 주세요/;
  if (noGo.test(text)) return false;

  const useful =
    /(추천|설명|알려|정리|비교|조합|설계|우선순위|타이밍|복용법|상호작용|부작용|대안|브랜드|제품|가이드|표로|정리해|체크|스케줄|휴지기|제형|라벨|관리|모니터링|루틴|점검|체크리스트)/;

  return useful.test(text);
}

async function callOpenAI(apiKey: string, payload: unknown, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function extractTopicByAI(apiKey: string, sourceText: string) {
  const payload = {
    model: await getDefaultModel(),
    response_format: { type: "json_object" as const },
    temperature: 0.2,
    max_tokens: 64,
    messages: buildSuggestionTopicClassifierMessages({
      topics: KNOWN_TOPICS,
      sourceText,
    }),
  };

  const response = await callOpenAI(apiKey, payload, 8000);
  if (!response.ok) return null;

  const json = await response.json().catch(() => null);
  const content = json?.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(content);
    const topic =
      typeof parsed?.topic === "string" ? parsed.topic.trim() : null;
    if (topic && KNOWN_TOPICS.includes(topic)) return topic;
  } catch {
    return null;
  }

  return null;
}

function parseSuggestionsFromChoices(
  choices: Array<any>,
  count: number,
  excludeSuggestions: string[] = []
) {
  const pool: string[] = [];
  const excludeKeys = new Set(
    excludeSuggestions.map(normalizeSuggestionKey).filter(Boolean)
  );

  for (const choice of choices) {
    const content = choice?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      const suggestions = Array.isArray(parsed?.suggestions)
        ? parsed.suggestions
        : [];
      for (const suggestion of suggestions) {
        if (typeof suggestion === "string") {
          pool.push(suggestion.trim());
        }
      }
    } catch {
      // ignore non-json candidates
    }
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const suggestion of pool) {
    const key = normalizeSuggestionKey(suggestion);
    if (!key || excludeKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    deduped.push(suggestion);
  }

  return deduped
    .filter(
      (suggestion) =>
        suggestion.length >= 12 &&
        suggestion.length <= 80 &&
        isAssistantDirected(suggestion)
    )
    .slice(0, count);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getOpenAIKey();
    const body = await req.json().catch(() => ({}));

    const text = trimText(body?.text || "", 1600);
    const count = 2;
    const excludeSuggestions: string[] = Array.isArray(body?.excludeSuggestions)
      ? body.excludeSuggestions
          .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];

    const contextSummary = buildUserContextSummary({
      profile: body?.profile ?? null,
      orders: Array.isArray(body?.orders) ? body.orders : [],
      assessResult: body?.assessResult ?? null,
      checkAiResult: body?.checkAiResult ?? null,
      chatSessions: Array.isArray(body?.chatSessions) ? body.chatSessions : [],
      currentSessionId:
        typeof body?.sessionId === "string" ? body.sessionId : null,
      localAssessCats: Array.isArray(body?.localAssessCats)
        ? body.localAssessCats
        : [],
      localCheckAiTopLabels: Array.isArray(body?.localCheckAiTopLabels)
        ? body.localCheckAiTopLabels
        : [],
      actorContext:
        body?.actorContext && typeof body.actorContext === "object"
          ? body.actorContext
          : null,
    });

    const fallbackSuggestions = buildDataDrivenSuggestions(
      contextSummary,
      count,
      excludeSuggestions
    );
    if (!text) {
      return new Response(JSON.stringify({ suggestions: fallbackSuggestions }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const recentMessages = Array.isArray(body?.recentMessages)
      ? body.recentMessages
      : [];

    const topicSource = buildTopicSourceText(
      text,
      recentMessages,
      contextSummary.promptSummaryText
    );

    let topic = extractTopicFromKnown(topicSource);
    if (!topic && apiKey) {
      try {
        topic = await extractTopicByAI(apiKey, topicSource);
      } catch {
        topic = null;
      }
    }

    let suggestions: string[] = [];

    if (apiKey) {
      const payload = {
        model: body?.model || (await getDefaultModel()),
        messages: buildSuggestionMessages({
          contextSummary,
          lastAssistantReply: text,
          recentMessages,
          count,
          topicHint: topic,
          excludeSuggestions,
        }),
        temperature: 0.7,
        max_tokens: 240,
        response_format: { type: "json_object" as const },
        n: 2,
      };

      let response = await callOpenAI(apiKey, payload);
      if (!response.ok) {
        response = await callOpenAI(apiKey, payload, 14000);
      }

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const choices = Array.isArray(json?.choices) ? json.choices : [];
        suggestions = parseSuggestionsFromChoices(
          choices,
          count,
          excludeSuggestions
        );
      }
    }

    const suggestionKeys = new Set(
      suggestions.map(normalizeSuggestionKey).filter(Boolean)
    );
    if (suggestions.length < count) {
      for (const fallback of fallbackSuggestions) {
        const key = normalizeSuggestionKey(fallback);
        if (!key || suggestionKeys.has(key)) continue;
        suggestions.push(fallback);
        suggestionKeys.add(key);
        if (suggestions.length >= count) break;
      }
    }

    if (suggestions.length < count) {
      const generic = [
        "현재 복용 중인 제품 기준으로 우선 조정할 항목을 정리해 주세요.",
        "추천 영양소 기준으로 2주 복용 루틴을 아침/저녁으로 짜주세요.",
        "2주 후 점검해야 할 지표를 항목별로 정리해 주세요.",
      ];
      for (const item of generic) {
        const key = normalizeSuggestionKey(item);
        if (!key || suggestionKeys.has(key)) continue;
        if (excludeSuggestions.some((excluded) => normalizeSuggestionKey(excluded) === key)) {
          continue;
        }
        suggestions.push(item);
        suggestionKeys.add(key);
        if (suggestions.length >= count) break;
      }
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, count) }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    const fallback = buildDataDrivenSuggestions(
      buildUserContextSummary({}),
      2
    );
    return new Response(JSON.stringify({ suggestions: fallback }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
