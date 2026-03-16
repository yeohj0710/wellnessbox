import { DEFAULT_CHAT_MODEL, getDefaultModel } from "@/lib/ai/models";
import { createCompatibleChatOpenAI } from "@/lib/ai/openai-chat-compat";

export const getOpenAIApiKey = () =>
  process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

export const createChatModel = async () => {
  const apiKey = getOpenAIApiKey();
  const configuredModel = await getDefaultModel().catch(() => DEFAULT_CHAT_MODEL);

  return createCompatibleChatOpenAI(configuredModel, {
    apiKey,
    temperature: 0,
  });
};
