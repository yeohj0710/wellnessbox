import { normalizeKey } from "./recommendedProductActions.shared";
import type { ProductIdScore, ProductNameItem } from "./recommendedProductActions.types";

function splitNormalizedTokens(value: string) {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => normalizeKey(token))
    .filter(Boolean);
}

function scoreTokenOverlap(targetValue: string, candidateValue: string) {
  const targetTokens = splitNormalizedTokens(targetValue);
  const candidateTokens = splitNormalizedTokens(candidateValue);
  if (targetTokens.length === 0 || candidateTokens.length === 0) return 0;

  const targetTokenSet = new Set(targetTokens);
  const candidateTokenSet = new Set(candidateTokens);
  let overlap = 0;
  for (const token of targetTokenSet) {
    if (candidateTokenSet.has(token)) overlap += 1;
  }
  if (overlap === 0) return 0;

  const coverage =
    overlap / Math.max(1, Math.max(targetTokenSet.size, candidateTokenSet.size));
  return overlap * 700 + Math.round(coverage * 400);
}

export function scoreNameMatch(targetRaw: string, candidateRaw: string) {
  const targetNorm = normalizeKey(targetRaw);
  const candidateNorm = normalizeKey(candidateRaw);
  if (!targetNorm || !candidateNorm) return -1;
  if (targetNorm === candidateNorm) return 10_000;

  let score = 0;
  if (candidateNorm.includes(targetNorm)) {
    score += 6_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  if (targetNorm.includes(candidateNorm)) {
    score += 4_000 - Math.abs(candidateNorm.length - targetNorm.length);
  }
  score += scoreTokenOverlap(targetRaw, candidateRaw);

  const maxPrefix = Math.min(targetNorm.length, candidateNorm.length, 12);
  let prefix = 0;
  while (prefix < maxPrefix && targetNorm[prefix] === candidateNorm[prefix]) {
    prefix += 1;
  }
  score += prefix * 50;
  return score;
}

export function findProductCandidatesByName(
  productName: string,
  catalog: ProductNameItem[],
  take = 4
) {
  if (!normalizeKey(productName)) return null;

  const candidates: ProductIdScore[] = [];
  for (const item of catalog) {
    const score = scoreNameMatch(productName, item.name);
    if (score < 0) continue;
    candidates.push({ id: item.id, score, source: "name" });
  }
  const out = candidates
    .filter((candidate) => candidate.score >= 1_000)
    .sort((left, right) => right.score - left.score)
    .slice(0, take);
  return out.length > 0 ? out : null;
}
