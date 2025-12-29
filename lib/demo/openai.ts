import { ChatOpenAI } from "@langchain/openai";

const modelName = "gpt-4o-mini";

const getApiKey = () => process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";

export const createChatModel = () =>
  new ChatOpenAI({
    apiKey: getApiKey(),
    modelName,
    temperature: 0,
  });
