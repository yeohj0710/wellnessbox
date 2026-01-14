import db from "@/lib/db";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";

export type LatestResults = {
  checkAiTopLabels?: string[];
  assessCats?: string[];
  assessPercents?: number[];
  checkAiCreatedAt?: string;
  assessCreatedAt?: string;
};

type ResultScope = {
  appUserId?: string | null;
  clientId?: string | null;
};

export async function getLatestResultsByScope(
  scope: ResultScope
): Promise<LatestResults> {
  try {
    const where = scope.appUserId
      ? { appUserId: scope.appUserId }
      : scope.clientId
      ? { clientId: scope.clientId }
      : null;
    if (!where) return {};
    const [checkAi, assess] = await Promise.all([
      db.checkAiResult.findFirst({ where, orderBy: { createdAt: "desc" } }),
      db.assessmentResult.findFirst({ where, orderBy: { createdAt: "desc" } }),
    ]);
    const out: LatestResults = {};
    if (checkAi) {
      const normalized = normalizeCheckAiResult(checkAi);
      if (normalized.topLabels.length) out.checkAiTopLabels = normalized.topLabels;
      if (checkAi.createdAt) out.checkAiCreatedAt = checkAi.createdAt.toISOString();
    }
    if (assess) {
      const normalized = normalizeAssessmentResult(assess);
      if (normalized.topLabels.length) out.assessCats = normalized.topLabels;
      if (normalized.scores.length) {
        out.assessPercents = normalized.scores.map((score) => score.value ?? 0);
      }
      if (assess.createdAt) out.assessCreatedAt = assess.createdAt.toISOString();
    }
    return out;
  } catch {
    return {};
  }
}

export async function getLatestResults(clientId: string): Promise<LatestResults> {
  return getLatestResultsByScope({ clientId });
}
