import { getDefaultModel } from "@/lib/ai/model";
import { buildSuggestionMessages } from "@/lib/chat/prompts";
import {
  buildTopicSourceText,
  callOpenAI,
  extractTopicByAI,
  extractTopicFromKnown,
  getOpenAIKey,
  isValidSuggestionText,
  parseSuggestionsFromChoices,
} from "./suggest-utils";
import {
  prepareSuggestRouteInput,
  resolveFinalSuggestions,
  resolveSafeFallbackSuggestions,
} from "./suggest-route-helpers";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

async function requestPrimarySuggestions(input: {
  apiKey: string;
  modelOverride: unknown;
  count: number;
  text: string;
  recentMessages: Array<{ role?: string; content?: unknown }>;
  contextSummary: ReturnType<typeof prepareSuggestRouteInput>["contextSummary"];
  runtimeContextText: string;
  excludeSuggestions: string[];
}) {
  const topicSource = buildTopicSourceText(
    input.text,
    input.recentMessages,
    [input.contextSummary.promptSummaryText, input.runtimeContextText]
      .filter(Boolean)
      .join("\n\n")
  );

  let topic = extractTopicFromKnown(topicSource);
  if (!topic) {
    try {
      topic = await extractTopicByAI(input.apiKey, topicSource);
    } catch {
      topic = null;
    }
  }

  const payload = {
    model: input.modelOverride || (await getDefaultModel()),
    messages: buildSuggestionMessages({
      contextSummary: input.contextSummary,
      lastAssistantReply: input.text,
      recentMessages: input.recentMessages,
      count: input.count,
      topicHint: topic,
      excludeSuggestions: input.excludeSuggestions,
    }),
    temperature: 0.7,
    max_tokens: 240,
    response_format: { type: "json_object" as const },
    n: 2,
  };

  let response = await callOpenAI(input.apiKey, payload);
  if (!response.ok) {
    response = await callOpenAI(input.apiKey, payload, 14000);
  }

  if (!response.ok) return [];
  const json = await response.json().catch(() => ({}));
  const choices = Array.isArray(json?.choices) ? json.choices : [];
  return parseSuggestionsFromChoices(choices, input.count, input.excludeSuggestions);
}

export async function runSuggestRoute(rawBody: unknown, count = 2) {
  const apiKey = getOpenAIKey();
  const body = asRecord(rawBody);
  const input = prepareSuggestRouteInput(rawBody, count);

  if (!input.text) {
    const safeFallback = input.fallbackSuggestions
      .filter((suggestion) => isValidSuggestionText(suggestion))
      .slice(0, input.count);

    return safeFallback.length > 0
      ? safeFallback
      : input.fallbackSuggestions.slice(0, input.count);
  }

  const primarySuggestions = apiKey
    ? await requestPrimarySuggestions({
        apiKey,
        modelOverride: body.model,
        count: input.count,
        text: input.text,
        recentMessages: input.recentMessages,
        contextSummary: input.contextSummary,
        runtimeContextText: input.runtimeContextText,
        excludeSuggestions: input.excludeSuggestions,
      })
    : [];

  return resolveFinalSuggestions({
    primarySuggestions,
    fallbackSuggestions: input.fallbackSuggestions,
    excludeSuggestions: input.excludeSuggestions,
    count: input.count,
  });
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function runSuggestPostRoute(req: Request, count = 2) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    return jsonResponse({
      suggestions: await runSuggestRoute(rawBody, count),
    });
  } catch {
    return jsonResponse({
      suggestions: resolveSafeFallbackSuggestions(count),
    });
  }
}
