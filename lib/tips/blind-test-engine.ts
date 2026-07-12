export type BlindTestFilter = "all" | "matched" | "mismatched" | "safety";
export type BlindTestRow = {
  caseId: string; archetypeId: string; exactMatch: boolean; gold: string[]; predicted: string[];
  riskTier: number; abstain: boolean; safetyRuleIds: string[];
};

export function selectBlindTestRows<T extends BlindTestRow>(rows: T[], input: { filter?: unknown; query?: unknown }) {
  const filter: BlindTestFilter = ["matched", "mismatched", "safety"].includes(String(input.filter))
    ? (String(input.filter) as BlindTestFilter) : "all";
  const query = String(input.query ?? "").trim().toLowerCase().slice(0, 100);
  return rows.filter((row) => {
    if (filter === "matched" && !row.exactMatch) return false;
    if (filter === "mismatched" && row.exactMatch) return false;
    if (filter === "safety" && !(row.riskTier > 0 || row.abstain || row.safetyRuleIds.length > 0)) return false;
    return !query || row.caseId.toLowerCase().includes(query) || row.archetypeId.toLowerCase().includes(query);
  });
}

export function summarizeBlindTests(rows: BlindTestRow[]) {
  const exactMatches = rows.filter((row) => row.exactMatch).length;
  const recommendationSlots = rows.reduce((sum, row) => sum + row.predicted.length, 0);
  const correctRecommendationSlots = rows.reduce((sum, row) => {
    const gold = new Set(row.gold);
    return sum + row.predicted.filter((ingredient) => gold.has(ingredient)).length;
  }, 0);
  const ingredientSupport = new Map<string, number>();
  for (const row of rows) for (const ingredient of row.gold) ingredientSupport.set(ingredient, (ingredientSupport.get(ingredient) ?? 0) + 1);
  return {
    evaluated: rows.length, exactMatches, mismatches: rows.length - exactMatches,
    exactMatchPercent: rows.length ? (exactMatches / rows.length) * 100 : 0,
    correctRecommendationSlots, recommendationSlots,
    setPrecisionPercent: recommendationSlots ? (correctRecommendationSlots / recommendationSlots) * 100 : 0,
    safetyCases: rows.filter((row) => row.riskTier > 0 || row.abstain || row.safetyRuleIds.length > 0).length,
    ingredientSupport: [...ingredientSupport.entries()].map(([ingredientId, count]) => ({ ingredientId, count })).sort((a, b) => b.count - a.count || a.ingredientId.localeCompare(b.ingredientId)),
  };
}
