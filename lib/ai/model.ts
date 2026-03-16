import { OpenAIEmbeddings } from "@langchain/openai";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import {
  DEFAULT_CHAT_MODEL,
  getDefaultModel as getConfiguredDefaultModel,
  normalizeChatModel,
} from "@/lib/ai/models";
import { createCompatibleChatOpenAI } from "@/lib/ai/openai-chat-compat";

function ensureKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

const DEFAULT_CHAT_TEMPERATURE = 0.45;
const MIN_CHAT_TEMPERATURE = 0;
const MAX_CHAT_TEMPERATURE = 1;

function resolveChatTemperature() {
  const raw = Number.parseFloat(process.env.OPENAI_CHAT_TEMPERATURE || "");
  if (!Number.isFinite(raw)) return DEFAULT_CHAT_TEMPERATURE;
  return Math.min(MAX_CHAT_TEMPERATURE, Math.max(MIN_CHAT_TEMPERATURE, raw));
}

export function getChatModel(
  modelName = DEFAULT_CHAT_MODEL
) {
  const apiKey = ensureKey();
  return createCompatibleChatOpenAI(normalizeChatModel(modelName), {
    apiKey,
    streaming: true,
    temperature: resolveChatTemperature(),
  });
}

export function getEmbeddings(): EmbeddingsInterface {
  const apiKey = ensureKey();
  return new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey,
  });
}

export async function getDefaultModelName() {
  try {
    return await getConfiguredDefaultModel();
  } catch {
    return DEFAULT_CHAT_MODEL;
  }
}

export const getDefaultModel = getDefaultModelName;
