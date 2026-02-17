import { NextRequest } from "next/server";
import { getDefaultModel } from "@/lib/ai/model";
import {
  buildDataDrivenSuggestions,
  buildUserContextSummary,
} from "@/lib/chat/context";
import { buildSuggestionMessages } from "@/lib/chat/prompts";
import {
  buildTopicSourceText,
  callOpenAI,
  extractTopicByAI,
  extractTopicFromKnown,
  getOpenAIKey,
  isValidSuggestionText,
  normalizeSuggestionKey,
  parseSuggestionsFromChoices,
  sanitizeSuggestionText,
  trimText,
} from "./suggest-utils";

export const runtime = "nodejs";

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
      const safeFallback = fallbackSuggestions
        .filter((suggestion) => isValidSuggestionText(suggestion))
        .slice(0, count);
      return new Response(
        JSON.stringify({
          suggestions:
            safeFallback.length > 0
              ? safeFallback
              : fallbackSuggestions.slice(0, count),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
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
    const addSuggestion = (candidate: string) => {
      const suggestionText =
        typeof candidate === "string" ? sanitizeSuggestionText(candidate) : "";
      if (!suggestionText || !isValidSuggestionText(suggestionText)) return false;
      const key = normalizeSuggestionKey(suggestionText);
      if (!key || suggestionKeys.has(key)) return false;
      if (
        excludeSuggestions.some(
          (excluded) => normalizeSuggestionKey(excluded) === key
        )
      ) {
        return false;
      }
      suggestions.push(suggestionText);
      suggestionKeys.add(key);
      return true;
    };

    if (suggestions.length < count) {
      for (const fallback of fallbackSuggestions) {
        addSuggestion(fallback);
        if (suggestions.length >= count) break;
      }
    }

    if (suggestions.length < count) {
      const generic = [
        "제 복용 제품 기준으로 지금 우선 조정할 항목을 정리해 주세요.",
        "제 추천 영양소 기준으로 2주 복용 루틴을 아침/저녁으로 짜주세요.",
        "제 상태 기준으로 2주 후 점검할 지표를 항목별로 정리해 주세요.",
      ];
      for (const item of generic) {
        addSuggestion(item);
        if (suggestions.length >= count) break;
      }
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, count) }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    const fallback = buildDataDrivenSuggestions(buildUserContextSummary({}), 2);
    return new Response(JSON.stringify({ suggestions: fallback }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
