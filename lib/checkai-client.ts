export const CHECK_AI_RESULT_STORAGE_KEY = "wb_check_ai_result_v1";

type CheckAiQuestionOption = {
  value: unknown;
  label: string;
};

type CheckAiQuestionSnapshot = {
  questions: readonly string[];
  options: readonly CheckAiQuestionOption[];
};

export type CheckAiClientScore = {
  label: string;
  prob: number;
  code?: string;
};

type CheckAiCategoryLite = {
  id: number;
  name: string;
};

type PersistCheckAiResultInput = {
  scores: readonly CheckAiClientScore[];
  answers: unknown;
  tzOffsetMinutes: number;
  topLabels?: readonly string[];
  questionSnapshot?: CheckAiQuestionSnapshot;
  saveUrl?: string;
};

type PredictApiRow = {
  label?: unknown;
  prob?: unknown;
  percent?: unknown;
  code?: unknown;
};

function normalizeProbability(
  probability: unknown,
  percent: unknown
): number {
  if (typeof probability === "number" && Number.isFinite(probability)) {
    const normalized =
      probability > 1 && probability <= 100 ? probability / 100 : probability;
    return Math.max(0, Math.min(1, normalized));
  }

  if (typeof percent === "number" && Number.isFinite(percent)) {
    return Math.max(0, Math.min(1, percent / 100));
  }

  return 0;
}

function normalizeTopLabels(raw: readonly string[]): string[] {
  return raw.map((label) => label.trim()).filter(Boolean).slice(0, 3);
}

function deriveTopLabels(scores: readonly CheckAiClientScore[]): string[] {
  return normalizeTopLabels(scores.map((score) => score.label));
}

export function normalizeCheckAiScores(
  rows: unknown,
  limit = 0
): CheckAiClientScore[] {
  if (!Array.isArray(rows)) return [];

  const normalized: CheckAiClientScore[] = [];
  for (const row of rows) {
    const candidate = row as PredictApiRow;
    const label =
      typeof candidate?.label === "string" ? candidate.label.trim() : "";
    if (!label) continue;

    const prob = normalizeProbability(candidate?.prob, candidate?.percent);
    const code = typeof candidate?.code === "string" ? candidate.code : undefined;

    if (code) {
      normalized.push({ code, label, prob });
      continue;
    }
    normalized.push({ label, prob });
  }

  normalized.sort((left, right) => right.prob - left.prob);

  if (limit > 0) {
    return normalized.slice(0, limit);
  }

  return normalized;
}

export async function requestCheckAiPredictScores(
  responses: readonly number[],
  predictUrl = "/api/predict",
  limit = 3
): Promise<CheckAiClientScore[]> {
  const response = await fetch(predictUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  });

  if (!response.ok) return [];

  const payload = await response.json().catch(() => null);
  return normalizeCheckAiScores(payload, limit);
}

export function resolveRecommendedCategoryIds(
  scores: readonly CheckAiClientScore[] | null | undefined,
  categories: readonly CheckAiCategoryLite[],
  limit = 3
): number[] {
  if (!scores || scores.length === 0 || categories.length === 0) return [];

  const ids = scores
    .map((score) => categories.find((category) => category.name === score.label)?.id)
    .filter((id): id is number => typeof id === "number");

  return Array.from(new Set(ids)).slice(0, limit);
}

export async function ensureMinimumDelay(
  startedAt: number,
  minimumMs: number
): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= minimumMs) return;
  await new Promise((resolve) => setTimeout(resolve, minimumMs - elapsed));
}

export function saveCheckAiTopLabelsLocal(topLabels: readonly string[]) {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(
      CHECK_AI_RESULT_STORAGE_KEY,
      JSON.stringify({
        topLabels: normalizeTopLabels([...topLabels]),
        savedAt: Date.now(),
      })
    );
  } catch {}
}

export async function persistCheckAiResult(
  input: PersistCheckAiResultInput
): Promise<void> {
  const topLabels = input.topLabels
    ? normalizeTopLabels([...input.topLabels])
    : deriveTopLabels(input.scores);

  saveCheckAiTopLabelsLocal(topLabels);

  try {
    const payload: Record<string, unknown> = {
      result: {
        topLabels,
        scores: input.scores,
      },
      answers: input.answers,
      tzOffsetMinutes: Number.isFinite(input.tzOffsetMinutes)
        ? input.tzOffsetMinutes
        : 0,
    };

    if (input.questionSnapshot) {
      payload.questionSnapshot = input.questionSnapshot;
    }

    await fetch(input.saveUrl ?? "/api/check-ai/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}
}
