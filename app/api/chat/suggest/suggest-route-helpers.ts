import {
  buildDataDrivenSuggestions,
  buildUserContextSummary,
} from "@/lib/chat/context";
import {
  isValidSuggestionText,
  normalizeSuggestionKey,
  sanitizeSuggestionText,
  trimText,
} from "./suggest-utils";

const DEFAULT_SUGGESTION_COUNT = 2;

const GENERIC_SUGGESTION_CANDIDATES = [
  "제 복용 제품 기준으로 지금 우선 조정할 항목을 정리해 주세요.",
  "제 추천 영양소 기준으로 2주 복용 루틴을 아침/저녁으로 짜주세요.",
  "제 상태 기준으로 2주 후 점검할 지표를 항목별로 정리해 주세요.",
];

type UnknownRecord = Record<string, unknown>;

type RecentMessage = {
  role?: string;
  content?: unknown;
};

export type SuggestRouteInput = {
  text: string;
  runtimeContextText: string;
  count: number;
  excludeSuggestions: string[];
  recentMessages: RecentMessage[];
  contextSummary: ReturnType<typeof buildUserContextSummary>;
  fallbackSuggestions: string[];
};

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function parseExcludeSuggestions(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parseRecentMessages(raw: unknown): RecentMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw as RecentMessage[];
}

export function prepareSuggestRouteInput(
  rawBody: unknown,
  count = DEFAULT_SUGGESTION_COUNT
): SuggestRouteInput {
  const body = asRecord(rawBody);
  const text = trimText(body.text || "", 1600);
  const runtimeContextText = trimText(body.runtimeContextText || "", 400);
  const excludeSuggestions = parseExcludeSuggestions(body.excludeSuggestions);
  const recentMessages = parseRecentMessages(body.recentMessages);

  const contextSummary = buildUserContextSummary({
    profile: body.profile ?? null,
    orders: Array.isArray(body.orders) ? body.orders : [],
    assessResult: body.assessResult ?? null,
    checkAiResult: body.checkAiResult ?? null,
    chatSessions: Array.isArray(body.chatSessions) ? body.chatSessions : [],
    currentSessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    localAssessCats: Array.isArray(body.localAssessCats) ? body.localAssessCats : [],
    localCheckAiTopLabels: Array.isArray(body.localCheckAiTopLabels)
      ? body.localCheckAiTopLabels
      : [],
    actorContext:
      body.actorContext && typeof body.actorContext === "object"
        ? body.actorContext
        : null,
  });

  const fallbackSuggestions = buildDataDrivenSuggestions(
    contextSummary,
    count,
    excludeSuggestions
  );

  return {
    text,
    runtimeContextText,
    count,
    excludeSuggestions,
    recentMessages,
    contextSummary,
    fallbackSuggestions,
  };
}

export function resolveFinalSuggestions(params: {
  primarySuggestions: string[];
  fallbackSuggestions: string[];
  excludeSuggestions: string[];
  count: number;
}) {
  const { fallbackSuggestions, excludeSuggestions, count } = params;
  const suggestions: string[] = [];
  const suggestionKeys = new Set<string>();
  const excludedKeys = new Set(
    excludeSuggestions.map(normalizeSuggestionKey).filter(Boolean)
  );

  const addSuggestion = (candidate: string) => {
    const suggestion = sanitizeSuggestionText(candidate);
    if (!suggestion || !isValidSuggestionText(suggestion)) return false;

    const key = normalizeSuggestionKey(suggestion);
    if (!key || excludedKeys.has(key) || suggestionKeys.has(key)) return false;

    suggestions.push(suggestion);
    suggestionKeys.add(key);
    return true;
  };

  for (const primary of params.primarySuggestions) {
    addSuggestion(primary);
    if (suggestions.length >= count) {
      return suggestions.slice(0, count);
    }
  }

  for (const fallback of fallbackSuggestions) {
    addSuggestion(fallback);
    if (suggestions.length >= count) {
      return suggestions.slice(0, count);
    }
  }

  for (const generic of GENERIC_SUGGESTION_CANDIDATES) {
    addSuggestion(generic);
    if (suggestions.length >= count) {
      break;
    }
  }

  return suggestions.slice(0, count);
}

export function resolveSafeFallbackSuggestions(count = DEFAULT_SUGGESTION_COUNT) {
  return buildDataDrivenSuggestions(buildUserContextSummary({}), count).slice(0, count);
}
