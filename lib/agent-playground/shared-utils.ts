import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import { NodePrompt } from "./types";

export const safeAnswer = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item ?? "")
          )
          .join(" ")
      : JSON.stringify(content ?? "");

export const coerceSingleLine = (text: string) =>
  text.replace(/\s+/g, " ").trim();

export const ensureTerms = (text: string, terms: string[]) => {
  let fixed = text;
  const lower = fixed.toLowerCase();
  for (const term of terms) {
    if (!lower.includes(term.toLowerCase())) {
      fixed = `${fixed} ${term}`.trim();
    }
  }
  return fixed;
};

export const normalizeRouteId = (text?: string) =>
  (text ?? "")
    .toLowerCase()
    .replace(/[-_\s]+/g, "")
    .replace(/[^a-z0-9]/g, "");

export const buildMessages = (prompt: NodePrompt) => {
  const messages = [] as (SystemMessage | HumanMessage | AIMessage)[];
  if (prompt.system) messages.push(new SystemMessage(prompt.system));
  messages.push(new HumanMessage(prompt.human));
  return messages;
};
