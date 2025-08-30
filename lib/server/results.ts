import db from "@/lib/db";

export type LatestResults = {
  checkAiTopLabels?: string[];
  assessCats?: string[];
  assessPercents?: number[];
  checkAiCreatedAt?: string;
  assessCreatedAt?: string;
};

export async function getLatestResults(clientId: string): Promise<LatestResults> {
  try {
    const [checkAi, assess] = await Promise.all([
      db.checkAiResult.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
      db.assessmentResult.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
    ]);
    const out: LatestResults = {};
    if (checkAi?.result) {
      try {
        const r = checkAi.result as any;
        if (Array.isArray(r?.topLabels)) out.checkAiTopLabels = r.topLabels as string[];
      } catch {}
      if (checkAi?.createdAt) out.checkAiCreatedAt = checkAi.createdAt.toISOString();
    }
    if (assess?.cResult) {
      try {
        const r = assess.cResult as any;
        if (Array.isArray(r?.catsOrdered)) out.assessCats = r.catsOrdered as string[];
        if (Array.isArray(r?.percents)) out.assessPercents = r.percents as number[];
      } catch {}
      if (assess?.createdAt) out.assessCreatedAt = assess.createdAt.toISOString();
    }
    return out;
  } catch {
    return {};
  }
}

