export function normalizeNewlines(text: string) {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([^\n])\n([ \t]*([-*+]\s|\d+\.\s))/g, "$1\n\n$2");
}

export function sanitizeAssistantText(text: string, finalize = false) {
  const cleaned = normalizeNewlines(text)
    .replace(/\n?\s*근거\s*:[^\n\r]*/g, "")
    .replace(/내 데이터 요약/g, "참고 데이터")
    .replace(/추천 제품\s*\(7일\s*예상가\)/g, "추천 제품(7일 기준 가격)")
    .replace(
      /(전문의|전문가|병원)\s*(와|과)?\s*상담(을|이|은|는)?\s*(권장|추천|해주세요|해\s*주세요)?/g,
      ""
    );
  return finalize ? cleaned.trim() : cleaned.replace(/^\n+/, "");
}
