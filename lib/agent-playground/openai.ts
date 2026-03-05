import { ChatOpenAI } from "@langchain/openai";
import { DEFAULT_CHAT_MODEL, getDefaultModel } from "@/lib/ai/models";

export const getOpenAIApiKey = () =>
  process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

export const createChatModel = async () => {
  const apiKey = getOpenAIApiKey();
  const configuredModel = await getDefaultModel().catch(() => DEFAULT_CHAT_MODEL);

  return new ChatOpenAI({
    apiKey,
    model: configuredModel,
    temperature: 0,
  });
};
