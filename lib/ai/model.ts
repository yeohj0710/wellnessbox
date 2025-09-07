import { ChatOpenAI } from "@langchain/openai";

export function getModel(streaming = false) {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    openAIApiKey: process.env.OPENAI_KEY,
    streaming,
  });
}
