export type SuggestionHistoryMap = Record<string, string[]>;

export function normalizeSuggestionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

export function getSuggestionHistory(
  historyMap: SuggestionHistoryMap,
  sessionId: string
) {
  return historyMap[sessionId] || [];
}

export function rememberSuggestions(
  historyMap: SuggestionHistoryMap,
  sessionId: string,
  nextSuggestions: string[],
  maxItems = 20
) {
  const prev = getSuggestionHistory(historyMap, sessionId);
  const merged = [...prev];
  const seen = new Set(prev.map(normalizeSuggestionKey).filter(Boolean));

  for (const suggestion of nextSuggestions) {
    const key = normalizeSuggestionKey(suggestion);
    if (!key || seen.has(key)) continue;
    merged.push(suggestion);
    seen.add(key);
  }

  historyMap[sessionId] = merged.slice(-maxItems);
}

export function pickFreshSuggestions(input: {
  pool: string[];
  recentSuggestionHistory: string[];
  count: number;
  extraExcludedKeys?: string[];
}) {
  const selected: string[] = [];
  const selectedKeys = new Set<string>();
  const excludedKeys = new Set(
    input.recentSuggestionHistory
      .map(normalizeSuggestionKey)
      .concat((input.extraExcludedKeys || []).map(normalizeSuggestionKey))
      .filter(Boolean)
  );

  for (const item of input.pool) {
    const key = normalizeSuggestionKey(item);
    if (!key || excludedKeys.has(key) || selectedKeys.has(key)) continue;
    selected.push(item.trim());
    selectedKeys.add(key);
    if (selected.length >= input.count) break;
  }

  return selected;
}
