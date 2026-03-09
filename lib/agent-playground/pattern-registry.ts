import { patterns } from "./patterns";

export const patternSummaries = patterns.map((pattern) => ({
  id: pattern.id,
  name: pattern.name,
  description: pattern.description,
  defaultPrompt: pattern.defaultPrompt,
}));

export const getPattern = (patternId?: string) =>
  patterns.find((pattern) => pattern.id === patternId) ?? patterns[0];

export { patterns };
