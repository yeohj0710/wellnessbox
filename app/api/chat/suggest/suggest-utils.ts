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

export function sanitizeSuggestionText(text: string) {
  const compact = text
    .replace(/\s+/g, " ")
    .replace(/^[\-*•\d.)\s]+/, "")
    .trim();
  if (!compact) return "";
  if (/[.?!]$/.test(compact)) return compact;
  return `${compact}.`;
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

function isChatbotAskingUser(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return /(하시나요|하셨나요|계신가요|느끼시나요|드시나요|있으신가요|어떠세요|해보시겠어요|보시겠어요|해보실래요|해볼까요|입력해주세요|말씀해주세요|보여드릴게요|도와드릴게요)/.test(
    normalized
  );
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

function isAssistantExecutableIntent(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const actionVerb =
    /(정리|추천|비교|분석|설계|계획|루틴|가이드|체크리스트|점검표|우선순위|계산|조정|제안|설명|알려|짜)/;
  const requestTone =
    /(해줘|해줄래|해주세요|해 주세요|주실래요|부탁해|부탁드려요|정리해줘|추천해줘|비교해줘|분석해줘|설계해줘|설명해줘|알려줘|짜줘)/;
  return actionVerb.test(normalized) && requestTone.test(normalized);
}

function isUserPerspectiveRequest(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const hasFirstPerson = /(제|내|제가|저의|저를)/.test(normalized);
  if (!hasFirstPerson) return false;
  return /(해주세요|해줘|해줄래|주실래요|부탁)/.test(normalized);
}

export function isValidSuggestionText(text: string) {
  const trimmed = sanitizeSuggestionText(text);
  if (trimmed.length < 12 || trimmed.length > 80) return false;
  if (isChatbotAskingUser(trimmed)) return false;
  if (isRetrospectiveUserCheck(trimmed)) return false;
  if (!isAssistantExecutableIntent(trimmed)) return false;
  if (!isUserPerspectiveRequest(trimmed)) return false;
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
          const sanitized = sanitizeSuggestionText(suggestion);
          if (sanitized) pool.push(sanitized);
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
