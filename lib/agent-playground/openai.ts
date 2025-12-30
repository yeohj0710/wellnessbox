import { ChatOpenAI } from "@langchain/openai";

export const getOpenAIApiKey = () =>
  process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

export const createChatModel = () => {
  const apiKey = getOpenAIApiKey();
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
  });
};
