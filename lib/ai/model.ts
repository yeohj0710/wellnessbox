import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

function ensureKey() {
  const key = process.env.OPENAI_KEY;
  if (!key) throw new Error("OPENAI_KEY is not set");
  return key;
}

export function getChatModel(
  modelName = process.env.OPENAI_MODEL || "gpt-4o-mini"
) {
  const apiKey = ensureKey();
  return new ChatOpenAI({
    model: modelName,
    temperature: 0.3,
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
