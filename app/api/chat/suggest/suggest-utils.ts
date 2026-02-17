import { getDefaultModel } from "@/lib/ai/model";
import { CATEGORY_LABELS } from "@/lib/categories";
import { toPlainText } from "@/lib/chat/context";
import { buildSuggestionTopicClassifierMessages } from "@/lib/chat/prompts";

export const KNOWN_TOPICS: string[] = Object.values(CATEGORY_LABELS);

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

export function trimText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function normalizeSuggestionKey(value: string) {
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

export function extractTopicFromKnown(text: string): string | null {
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

export function buildTopicSourceText(
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

function isRetrospectiveUserCheck(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const retrospective = [
    /\ubcf5\uc6a9(\ud55c|\ud6c4|\ub4a4|\ud558\uace0)/,
    /\uc12d\ucde8(\ud55c|\ud6c4|\ub4a4)/,
    /\uba39(\uc740|\uace0\ub09c|\uace0)/,
    /\ubcc0\ud654\uac00\uc788\uc5c8\ub294\uc9c0/,
    /\uc5b4\ub560\ub294\uc9c0/,
    /\ub290\ub080\ub294\uc9c0/,
    /\ud574\ubcf4\uc168/,
    /\ubcf4\uc2dc\uaca0\uc5b4\uc694\??$/,
  ];
  if (!retrospective.some((pattern) => pattern.test(normalized))) return false;
  return /(\ubcc0\ud654|\ubc18\uc751|\ud6a8\uacfc|\uccb4\uac10|\uc5b4\ub560|\ub290\ub080|\uc788\uc5c8)/.test(
    normalized
  );
}

function isExecutableAssistantRequest(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const actionVerb =
    /(\uc815\ub9ac|\ucd94\ucc9c|\ube44\uad50|\ubd84\uc11d|\uc124\uacc4|\uacc4\ud68d|\ub8e8\ud2f4|\uac00\uc774\ub4dc|\uccb4\ud06c\ub9ac\uc2a4\ud2b8|\uc810\uac80\ud45c|\uc6b0\uc120\uc21c\uc704|\uacc4\uc0b0|\uc870\uc815|\uc81c\uc548|\uc124\uba85|\uc54c\ub824|\uc9dc)/;
  const requestTone =
    /(\ud574\uc918|\ud574\uc904\ub798|\ud574\uc8fc\uc138\uc694|\ud574\s*\uc8fc\uc138\uc694|\uc8fc\uc138\uc694|\ubd80\ud0c1|\uc815\ub9ac\ud574|\ucd94\ucc9c\ud574|\ube44\uad50\ud574|\ubd84\uc11d\ud574|\uc124\uacc4\ud574|\uc124\uba85\ud574|\uc54c\ub824\uc918|\uc9dc\uc918)/;
  return actionVerb.test(normalized) && requestTone.test(normalized);
}

export function isValidSuggestionText(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 12 || trimmed.length > 80) return false;
  if (!isAssistantDirected(trimmed)) return false;
  if (isRetrospectiveUserCheck(trimmed)) return false;
  if (!isExecutableAssistantRequest(trimmed)) return false;
  return true;
}

export async function callOpenAI(
  apiKey: string,
  payload: unknown,
  timeoutMs = 10000
) {
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

export async function extractTopicByAI(apiKey: string, sourceText: string) {
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

export function parseSuggestionsFromChoices(
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
    .filter((suggestion) => isValidSuggestionText(suggestion))
    .slice(0, count);
}
