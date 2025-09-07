import { ChatPromptTemplate } from "@langchain/core/prompts";

export const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", "{system}"],
  ["system", "{guidelines}"],
  ["system", "{retrieved}"],
  ["system", "{conversation}"],
  ["user", "{user}"],
]);
