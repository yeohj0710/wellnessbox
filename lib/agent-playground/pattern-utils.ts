export const sentenceCount = (text: string) => {
  const normalized = text.replace(/\n+/g, ".");
  return normalized
    .split(/[.!?]/)
    .map((segment) => segment.trim())
    .filter(Boolean).length;
};

export const lineCount = (text: string) =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length;

export const includesAll = (text: string, terms: string[]) =>
  terms.every((term) => text.toLowerCase().includes(term.toLowerCase()));

export const withinLength = (text: string, min: number, max: number) =>
  text.length >= min && text.length <= max;

export const parseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
