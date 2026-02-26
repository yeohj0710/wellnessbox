import type {
  RndModule05CandidateItem,
  RndModule05ObjectiveWeights,
  RndModule05OptimizationInput,
  RndModule05ReasonCode,
} from "./contracts";

export type ItemSignal = {
  signalId: string;
  score: number;
};

export type ComboScore = {
  efficacyComponent: number;
  riskComponent: number;
  costComponent: number;
  totalScore: number;
};

export type ComboDraft = {
  comboId: string;
  itemIds: string[];
  ingredientCodes: string[];
  monthlyCostKrw: number;
  dailyDoseCount: number;
  score: ComboScore;
  reasonCodes: RndModule05ReasonCode[];
  signalIds: string[];
};

export type ExcludedCombo = {
  comboId: string;
  blockedIngredientCodes: string[];
  evidenceConstraintIds: string[];
};

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeKeyPart(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || "na";
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function roundTo(value: number, digits: number): number {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
}

export function assertObjectiveWeights(value: RndModule05ObjectiveWeights): void {
  const keys: (keyof RndModule05ObjectiveWeights)[] = ["efficacy", "risk", "cost"];
  for (const key of keys) {
    const score = value[key];
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new Error(`objectiveWeights.${key} must be between 0 and 1.`);
    }
  }

  const sum = value.efficacy + value.risk + value.cost;
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error("objectiveWeights must sum to exactly 1.");
  }
}

export function buildSignalMap(
  input: RndModule05OptimizationInput
): Map<string, ItemSignal> {
  const candidateItemIds = new Set(input.candidates.map((candidate) => candidate.itemId));
  if (candidateItemIds.size !== input.candidates.length) {
    throw new Error("Module 05 MVP candidates must be unique by itemId.");
  }

  const signalMap = new Map<string, ItemSignal>();
  for (const signal of input.efficacySignals) {
    if (!candidateItemIds.has(signal.itemId)) {
      throw new Error(`Efficacy signal references unknown itemId: ${signal.itemId}`);
    }
    if (signalMap.has(signal.itemId)) {
      throw new Error(`Duplicate efficacy signal for itemId: ${signal.itemId}`);
    }
    signalMap.set(signal.itemId, {
      signalId: signal.signalId,
      score: roundTo(signal.expectedBenefitScore * signal.confidenceScore, 6),
    });
  }

  if (signalMap.size !== input.candidates.length) {
    throw new Error("Module 05 MVP requires exactly one efficacy signal per candidate item.");
  }

  return signalMap;
}

export function buildBlockedConstraintMap(
  input: RndModule05OptimizationInput
): Map<string, string[]> {
  const blockedMap = new Map<string, string[]>();
  for (const constraint of input.safetyConstraints) {
    if (constraint.decision !== "block") continue;
    const ingredientKey = normalizeToken(constraint.ingredientCode);
    const current = blockedMap.get(ingredientKey) ?? [];
    current.push(constraint.constraintId);
    blockedMap.set(ingredientKey, uniqueSorted(current));
  }
  return blockedMap;
}

export function buildLimitedIngredientSet(
  input: RndModule05OptimizationInput
): Set<string> {
  const limitedIngredients = input.safetyConstraints
    .filter((constraint) => constraint.decision === "limit")
    .map((constraint) => normalizeToken(constraint.ingredientCode));
  return new Set(limitedIngredients);
}

export function buildComboId(itemIds: string[]): string {
  const suffix = itemIds.map((itemId) => normalizeKeyPart(itemId)).join("-");
  return `m05-mvp-combo-${suffix}`;
}

export function generateCombinations(
  candidates: RndModule05CandidateItem[],
  comboSize: number
): RndModule05CandidateItem[][] {
  const sortedCandidates = [...candidates].sort((left, right) =>
    left.itemId.localeCompare(right.itemId)
  );
  const results: RndModule05CandidateItem[][] = [];
  const selected: RndModule05CandidateItem[] = [];

  const dfs = (start: number) => {
    if (selected.length === comboSize) {
      results.push([...selected]);
      return;
    }

    const remaining = comboSize - selected.length;
    const maxStart = sortedCandidates.length - remaining;
    for (let index = start; index <= maxStart; index += 1) {
      selected.push(sortedCandidates[index]);
      dfs(index + 1);
      selected.pop();
    }
  };

  dfs(0);
  return results;
}

export function buildReasonCodes(
  efficacyComponent: number,
  monthlyCostKrw: number,
  dailyDoseCount: number,
  preference: RndModule05OptimizationInput["preference"]
): RndModule05ReasonCode[] {
  const reasonCodes: RndModule05ReasonCode[] = ["goal_match", "safety_compliant"];
  if (efficacyComponent >= 0.6) {
    reasonCodes.push("efficacy_priority");
  }
  if (monthlyCostKrw <= preference.monthlyBudgetKrw) {
    reasonCodes.push("budget_fit");
  }
  if (dailyDoseCount <= preference.maxDailyDoseCount) {
    reasonCodes.push("dose_convenience");
  }
  return uniqueSorted(reasonCodes) as RndModule05ReasonCode[];
}
