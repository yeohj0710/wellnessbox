import { ChatOpenAI } from "@langchain/openai";
import { getChatModelOption, normalizeChatModel } from "@/lib/ai/models";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

type ChatOpenAIFields = NonNullable<ConstructorParameters<typeof ChatOpenAI>[0]>;

export type OpenAIChatCompletionsPayload = Record<string, unknown> & {
  model: string;
  messages: unknown;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
};

type OpenAIChatCompatProfile = {
  model: string;
  supportsCustomTemperature: boolean;
  supportsTopP: boolean;
  usesMaxCompletionTokens: boolean;
};

function resolveModelFamily(model: string) {
  const option = getChatModelOption(model);
  if (option) return option.family;
  if (model.startsWith("gpt-5")) return "gpt-5";
  if (model === "o3" || model.startsWith("o4-")) return "o-series";
  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getOpenAIChatCompatProfile(modelName: string): OpenAIChatCompatProfile {
  const model = normalizeChatModel(modelName);
  const family = resolveModelFamily(model);

  return {
    model,
    supportsCustomTemperature: family !== "gpt-5",
    supportsTopP: family !== "gpt-5",
    usesMaxCompletionTokens: family === "o-series",
  };
}

export function buildCompatibleChatOpenAIConfig(
  modelName: string,
  fields: ChatOpenAIFields
): ChatOpenAIFields {
  const profile = getOpenAIChatCompatProfile(modelName);
  const payload = {
    ...fields,
    model: profile.model,
  } as Record<string, unknown>;

  if (!profile.supportsCustomTemperature) {
    delete payload.temperature;
  }

  if (!profile.supportsTopP) {
    delete payload.topP;
  }

  return payload as ChatOpenAIFields;
}

export function createCompatibleChatOpenAI(
  modelName: string,
  fields: ChatOpenAIFields
) {
  return new ChatOpenAI(buildCompatibleChatOpenAIConfig(modelName, fields));
}

export function normalizeOpenAIChatCompletionsPayload<T extends OpenAIChatCompletionsPayload>(
  payload: T
): T {
  const profile = getOpenAIChatCompatProfile(payload.model);
  const normalized = {
    ...payload,
    model: profile.model,
  } as Record<string, unknown>;

  if (!profile.supportsCustomTemperature) {
    delete normalized.temperature;
  }

  if (!profile.supportsTopP) {
    delete normalized.top_p;
  }

  if (
    profile.usesMaxCompletionTokens &&
    normalized.max_completion_tokens == null &&
    isFiniteNumber(normalized.max_tokens)
  ) {
    normalized.max_completion_tokens = normalized.max_tokens;
  }

  if (profile.usesMaxCompletionTokens) {
    delete normalized.max_tokens;
  }

  return normalized as T;
}

function repairOpenAIChatCompletionsPayload(
  payload: OpenAIChatCompletionsPayload,
  errorText: string
): OpenAIChatCompletionsPayload | null {
  const lower = errorText.toLowerCase();
  const repaired = { ...payload } as Record<string, unknown>;
  let changed = false;

  const temperatureUnsupported =
    lower.includes("unsupported value: 'temperature'") ||
    (lower.includes("temperature") && lower.includes("only the default (1) value is supported"));

  if (temperatureUnsupported && "temperature" in repaired) {
    delete repaired.temperature;
    changed = true;
  }

  const topPUnsupported =
    lower.includes("unsupported value: 'top_p'") ||
    lower.includes("unsupported parameter: 'top_p'") ||
    (lower.includes("top_p") && lower.includes("does not support"));

  if (topPUnsupported && "top_p" in repaired) {
    delete repaired.top_p;
    changed = true;
  }

  const maxTokensUnsupported =
    lower.includes("unsupported parameter: 'max_tokens'") ||
    lower.includes("unsupported value: 'max_tokens'") ||
    (lower.includes("max_tokens") &&
      (lower.includes("not compatible") || lower.includes("max_completion_tokens")));

  if (maxTokensUnsupported && "max_tokens" in repaired) {
    if (repaired.max_completion_tokens == null && isFiniteNumber(repaired.max_tokens)) {
      repaired.max_completion_tokens = repaired.max_tokens;
    }
    delete repaired.max_tokens;
    changed = true;
  }

  return changed
    ? normalizeOpenAIChatCompletionsPayload(
        repaired as OpenAIChatCompletionsPayload
      )
    : null;
}

async function postOpenAIChatCompletions(
  apiKey: string,
  payload: OpenAIChatCompletionsPayload,
  signal: AbortSignal
) {
  return fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function callOpenAIChatCompletions(
  apiKey: string,
  payload: OpenAIChatCompletionsPayload,
  timeoutMs = 10_000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const normalizedPayload = normalizeOpenAIChatCompletionsPayload(payload);
    const response = await postOpenAIChatCompletions(
      apiKey,
      normalizedPayload,
      controller.signal
    );

    if (response.ok || response.status !== 400) {
      return response;
    }

    const errorText = await response.text().catch(() => "");
    const repairedPayload = repairOpenAIChatCompletionsPayload(
      normalizedPayload,
      errorText
    );

    if (!repairedPayload) {
      return new Response(errorText, {
        status: response.status,
        headers: new Headers(response.headers),
      });
    }

    const retriedResponse = await postOpenAIChatCompletions(
      apiKey,
      repairedPayload,
      controller.signal
    );

    if (retriedResponse.ok) {
      return retriedResponse;
    }

    const retryErrorText = await retriedResponse.text().catch(() => errorText);
    return new Response(retryErrorText || errorText, {
      status: retriedResponse.status,
      headers: new Headers(retriedResponse.headers),
    });
  } finally {
    clearTimeout(timer);
  }
}
