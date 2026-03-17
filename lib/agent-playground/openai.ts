import { resolveGovernedModel } from "@/lib/ai/governance";
import { DEFAULT_CHAT_MODEL, getDefaultModel } from "@/lib/ai/models";
import { createCompatibleChatOpenAI } from "@/lib/ai/openai-chat-compat";

export const getOpenAIApiKey = () =>
  process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

export const createChatModel = async () => {
  const apiKey = getOpenAIApiKey();
  const configuredModel = await getDefaultModel().catch(() => DEFAULT_CHAT_MODEL);
  const model = resolveGovernedModel({
    task: "agent_playground",
    configuredModel,
  }).resolvedModel;

  return createCompatibleChatOpenAI(model, {
    apiKey,
    temperature: 0,
  });
};
