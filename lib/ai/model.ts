import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

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
  modelName = process.env.OPENAI_MODEL || "gpt-4o-mini"
) {
  const apiKey = ensureKey();
  return new ChatOpenAI({
    model: modelName,
    temperature: resolveChatTemperature(),
    apiKey,
    streaming: true,
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
    const { default: db } = await import("@/lib/db");
    const record = await db.config.findUnique({ where: { key: "chatModel" } });
    return record?.value || "gpt-4o-mini";
  } catch {
    return "gpt-4o-mini";
  }
}

export const getDefaultModel = getDefaultModelName;
